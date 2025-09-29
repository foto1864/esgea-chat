import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadIssues, updateIssue } from './storage'
import { chatWithGPT } from './ChatGPT'

function U(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

export default function Moderator(){
  const [issues,setIssues]=useState(loadIssues())
  const [activeId,setActiveId]=useState(issues.find(i=>i.status!=='resolved')?.id||null)
  const [messages,setMessages]=useState([])
  const [input,setInput]=useState('')
  const taRef=useRef(null)
  const MAX=240
  useEffect(()=>{ if(taRef.current){ taRef.current.style.height='auto'; const h=Math.min(taRef.current.scrollHeight,MAX); taRef.current.style.height=h+'px'; taRef.current.style.overflowY=taRef.current.scrollHeight>MAX?'auto':'hidden'}},[input])
  const active=useMemo(()=>issues.find(i=>i.id===activeId)||null,[issues,activeId])
  const chatRef=useRef(null)
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight },[messages])

  useEffect(()=>{
    if(!active){ setMessages([]); return }
    const seed=[
      {id:U(),role:'assistant',content:'A client has submitted the report below. Do you need help understanding or planning next steps?'},
      {id:U(),role:'assistant',content:active.report}
    ]
    setMessages(seed)
  },[activeId])

  function push(role,content){ setMessages(prev=>[...prev,{id:U(),role,content}]) }

  async function onSend(){
    const text=input.trim()
    if(!text||!active) return
    push('user',text)
    setInput('')
    push('assistant','Thinking…')
    const base=[{role:'system',content:'You assist a moderator with concise, actionable guidance: recap, ESG rationale, stakeholders, 3–5 next steps. Avoid boilerplate.'}]
    const msgs=base.concat(messages.map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}))).concat([{role:'user',content:text}])
    const reply=await chatWithGPT(msgs)
    setMessages(prev=>prev.slice(0,-1).concat([{id:U(),role:'assistant',content:reply}]))
  }

  function toggleStatus(){
    if(!active) return
    const nextStatus=active.status==='resolved'?'submitted':'resolved'
    const it=updateIssue(active.id,{status:nextStatus})
    setIssues(prev=>prev.map(i=>i.id===it.id?it:i))
  }

  function goHome(){ setActiveId(null) }

  const unresolved=issues.filter(i=>i.status!=='resolved')
  const resolved=issues.filter(i=>i.status==='resolved')

  return (
    <div className="app">
      <aside className="sidebar">
        <button onClick={goHome} style={{background:'#64748b',marginBottom:10}}>Home</button>
        <div style={{padding:'6px 0',color:'#b91c1c',fontSize:12}}>Unresolved</div>
        {unresolved.map(i=>(
          <div key={i.id} className={'convo '+(i.id===activeId?'active':'')} onClick={()=>setActiveId(i.id)}>{i.title}</div>
        ))}
        <div style={{padding:'6px 0',color:'#065f46',fontSize:12}}>Resolved</div>
        {resolved.map(i=>(
          <div key={i.id} className={'convo '+(i.id===activeId?'active':'')} onClick={()=>setActiveId(i.id)}>{i.title}</div>
        ))}
        <div style={{marginTop:'auto',display:'flex',gap:8}}>
          <Link to="/" style={{flex:1,textAlign:'center',background:'#334155',color:'#fff',padding:'8px',borderRadius:8,textDecoration:'none'}}>Main Menu</Link>
          <Link to="/" style={{flex:1,textAlign:'center',background:'#334155',color:'#fff',padding:'8px',borderRadius:8,textDecoration:'none'}}>Log Out</Link>
        </div>
      </aside>

      <main className="main">
        <div className="chat" ref={chatRef}>
          <div className="chat-inner">
            {!active && <div style={{textAlign:'center',opacity:.7,marginTop:'10vh'}}>Select an issue from the left.</div>}
            {active && messages.map(m=>(
              <div key={m.id} className={'msg-row '+(m.role==='assistant'?'assistant':'user')}>
                <div className={'bubble '+(m.role==='assistant'?'assistant':'user')}>
                  <b>{m.role==='assistant'?'Assistant':'You'}:</b> {m.content}
                </div>
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
              placeholder={active?'Ask about this issue…':'Open an issue to start'}
              disabled={!active}
            />
            <button onClick={onSend} disabled={!active}>Send</button>
            <button onClick={toggleStatus} style={{background:active&&active.status==='resolved'?'#f59e0b':'#10b981'}} disabled={!active}>
              {active&&active.status==='resolved'?'Mark Unresolved':'Mark Resolved'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}