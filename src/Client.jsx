import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addIssue } from './storage'
import { chatWithGPT, askRAG } from './ChatGPT'
import { autoTag, extractSubject } from './tagging'

function U(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

const examples=[
  'Oil spill risk near the marina from maintenance activities.',
  'Workplace safety training for dock workers seems insufficient.',
  'Board lacks independent oversight on environmental reporting.',
]

// Regex used to detect facilitator replies
const FACIL_RE = /^(I see an ESG concern\.|Κατάλαβα ότι περιγράφεις ESG)/i

async function genTitleFromFirstMessage(text){
  const sys={role:'system',content:'You create a concise chat title (2-6 words). No punctuation, no quotes, Title Case. If vague, return a generic category like "Environmental Concern". Return only the title.'}
  const user={role:'user',content:text}
  try{
    const r=await chatWithGPT([sys,user])
    const t=(r||'').split('\n')[0].trim()
    if(!t) throw new Error()
    return t.length>60?t.slice(0,60):t
  }catch{
    const s=(text||'').trim().toLowerCase()
    if(/environment/.test(s)) return 'Environmental Concern'
    if(/safety/.test(s)) return 'Safety Concern'
    if(/governance|board|policy/.test(s)) return 'Governance Matter'
    if(/social|community|stakeholder/.test(s)) return 'Social Concern'
    return 'ESG Inquiry'
  }
}

export default function Client(){
  // add facilitatorArmed per conversation
  const [convos,setConvos]=useState(()=>[{id:U(),title:'New chat',messages:[], facilitatorArmed:false }])
  const [activeId,setActiveId]=useState(convos[0].id)
  const [input,setInput]=useState('')
  const taRef=useRef(null)
  const MAX=240
  const active=useMemo(()=>convos.find(c=>c.id===activeId),[convos,activeId])
  useEffect(()=>{ if(taRef.current){ taRef.current.style.height='auto'; const h=Math.min(taRef.current.scrollHeight,MAX); taRef.current.style.height=h+'px'; taRef.current.style.overflowY=taRef.current.scrollHeight>MAX?'auto':'hidden'}},[input])
  const chatRef=useRef(null)
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight },[active?.messages])

  function push(role,content){
    setConvos(prev=>prev.map(c=>c.id===activeId?{...c,messages:[...c.messages,{id:U(),role,content}]}:c))
  }

  async function callAI(prompt){
    // snapshot whether we’re armed BEFORE pushing “Thinking…”
    const armed = !!active?.facilitatorArmed

    push('assistant','Thinking…')

    try{
      const reply = await askRAG(prompt, { citations:false, top_k:6, facilitator: armed })

      // Replace the “Thinking…” bubble with the real reply
      setConvos(prev => prev.map(c => {
        if (c.id !== activeId) return c
        const newMsgs = c.messages.slice(0,-1).concat([{id:U(), role:'assistant', content:reply}])
        // One-shot: immediately disarm after we used it
        let facilitatorArmed = false
        // If the reply itself is a facilitator prompt, arm for exactly the next user message
        if (FACIL_RE.test(reply)) facilitatorArmed = true
        return {...c, messages:newMsgs, facilitatorArmed}
      }))

    }catch(e){
      setConvos(prev => prev.map(c =>
        c.id===activeId
          ? {...c, messages: c.messages.slice(0,-1).concat([{id:U(), role:'assistant', content:`RAG error: ${e.message}`}])}
          : c
      ))
    }

    // Title for first user message in this chat
    const userMsgCount = active.messages.filter(m=>m.role==='user').length + 1
    if(userMsgCount===1){
      const title = await genTitleFromFirstMessage(prompt)
      setConvos(prev => prev.map(c => c.id===activeId ? {...c, title} : c))
    }
  }

  function onSend(){
    const text=input.trim()
    if(!text) return
    push('user',text)
    setInput('')

    // After the user sends a message, if we were armed, consume it now
    setConvos(prev => prev.map(c => c.id===activeId ? {...c, facilitatorArmed: c.facilitatorArmed ? false : c.facilitatorArmed} : c))

    callAI(text)
  }

  async function finalizeReport(){
    const transcript = active.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
    const lang = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(transcript) ? 'el' : 'en'
    const sys = {
      role:'system',
      content:`Rewrite the client's concern into a formal ESG incident report in ${lang} with fields:
From, To, Subject, Prologue (1 paragraph), Main text (2–4 paragraphs), Ending (1 paragraph with potential solutions).
Be concise, professional, and neutral.`
    }
    const r = await chatWithGPT([sys, {role:'user', content: transcript}])
    push('assistant','Final draft:\n\n'+r)
  }

  function submitReport(){
    const last=[...active.messages].reverse().find(m=>m.role==='assistant'&&m.content.startsWith('Final draft:'))
    if(!last) return alert('Create a final draft first.')
    const reportText=last.content.replace(/^Final draft:\s*/,'')
    const subject=extractSubject(reportText) || active.title || 'ESG Report'
    const tags=autoTag((active.title||'')+' '+reportText, subject)
    const issue=addIssue({title:active.title||'Report',subject,report:reportText,tags,status:'submitted'})
    alert('Submitted. ID: '+issue.id)
  }

  function newChat(){
    const c={id:U(),title:'New chat',messages:[], facilitatorArmed:false}
    setConvos([c,...convos]); setActiveId(c.id)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <button onClick={newChat}>New Chat</button>
        <div style={{padding:'6px 0',color:'#475569',fontSize:12}}>Examples</div>
        {examples.map((e,i)=>(<div key={i} className="convo" onClick={()=>setInput(e)}>{e}</div>))}
        <div style={{padding:'6px 0',color:'#475569',fontSize:12}}>Conversations</div>
        {convos.map(c=>(
          <div key={c.id} className={'convo '+(c.id===activeId?'active':'')} onClick={()=>setActiveId(c.id)}>{c.title}</div>
        ))}
        <div style={{marginTop:'auto',display:'flex',gap:8}}>
          <Link to="/" style={{flex:1,textAlign:'center',background:'#334155',color:'#fff',padding:'8px',borderRadius:8,textDecoration:'none'}}>Main Menu</Link>
          <Link to="/" style={{flex:1,textAlign:'center',background:'#334155',color:'#fff',padding:'8px',borderRadius:8,textDecoration:'none'}}>Log Out</Link>
        </div>
      </aside>

      <main className="main">
        <div className="chat" ref={chatRef}>
          <div className="chat-inner">
            {active.messages.length===0 && (<div style={{textAlign:'center',opacity:.7,marginTop:'10vh'}}>Start by describing your ESG concern.</div>)}
            {active.messages.map(m=>(
              <div key={m.id} className={'msg-row '+m.role}>
                <div className={'bubble '+m.role}><b>{m.role==='user'?'You':'Assistant'}:</b> {m.content}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="composer">
          <div className="composer-inner">
            <textarea
              ref={taRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); onSend() } }}
              placeholder="Type your concern..."
            />
            <button onClick={onSend}>Send</button>
            <button onClick={finalizeReport} style={{background:'#0f766e'}}>Finalize</button>
            <button onClick={submitReport} style={{background:'#10b981'}}>Submit</button>
          </div>
        </div>
      </main>
    </div>
  )
}
