import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addIssue } from './storage'
import { chatWithGPT } from './ChatGPT'

function U(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

const examples=[
  'Oil spill risk near the marina from maintenance activities.',
  'Workplace safety training for dock workers seems insufficient.',
  'Board lacks independent oversight on environmental reporting.',
]

export default function Client(){
  const [convos,setConvos]=useState(()=>[{id:U(),title:'New chat',messages:[] }])
  const [activeId,setActiveId]=useState(convos[0].id)
  const [input,setInput]=useState('')
  const taRef=useRef(null)
  const MAX=240
  const active=useMemo(()=>convos.find(c=>c.id===activeId),[convos,activeId])
  useEffect(()=>{ if(taRef.current){ taRef.current.style.height='auto'; const h=Math.min(taRef.current.scrollHeight,MAX); taRef.current.style.height=h+'px'; taRef.current.style.overflowY=taRef.current.scrollHeight>MAX?'auto':'hidden'}},[input])
  const chatRef=useRef(null)
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight },[active?.messages])

  function push(role,content){ setConvos(prev=>prev.map(c=>c.id===activeId?{...c,messages:[...c.messages,{id:U(),role,content}]}:c)) }

  async function callAI(prompt){
    push('assistant','Thinking…')
    const messages=active.messages.concat([{role:'user',content:prompt}]).map(m=>({role:m.role,content:m.content}))
    const reply=await chatWithGPT(messages)
    setConvos(prev=>prev.map(c=>c.id===activeId?{...c,messages:c.messages.slice(0,-1).concat([{id:U(),role:'assistant',content:reply}])}:c))
    if(active.messages.filter(m=>m.role==='user').length===0){
      const t=prompt.split(' ').slice(0,4).join(' ')
      setConvos(prev=>prev.map(c=>c.id===activeId?{...c,title:t||'New chat'}:c))
    }
  }

  function onSend(){
    const text=input.trim()
    if(!text) return
    push('user',text)
    setInput('')
    callAI(text)
  }

  async function finalizeReport(){
    const transcript=active.messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n')
    const sys={role:'system',content:'Rewrite the client’s concern into a formal report with fields: From, To, Subject, Prologue (1 paragraph), Main text (2–4 paragraphs), Ending (1 paragraph with potential solutions). Keep it concise, professional, and ESG-relevant.'}
    const r=await chatWithGPT([sys,{role:'user',content:transcript}])
    push('assistant','Final draft:\n\n'+r)
  }

  function submitReport(){
    const last=[...active.messages].reverse().find(m=>m.role==='assistant'&&m.content.startsWith('Final draft:'))
    if(!last) return alert('Create a final draft first.')
    const issue=addIssue({title:active.title||'Report',report:last.content.replace(/^Final draft:\s*/,''),status:'submitted'})
    alert('Submitted. ID: '+issue.id)
  }

  function newChat(){
    const c={id:U(),title:'New chat',messages:[]}
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
