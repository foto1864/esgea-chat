import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadIssues, updateIssue } from './storage'
import { chatWithGPT } from './ChatGPT'
import { TAXONOMY_LIST, autoTag, extractSubject } from './tagging'
import { searchIssues } from './search'

function U(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

function groupByTag(issues){
  const map=new Map()
  for(const it of issues){
    const tags=(it.tags&&it.tags.length?it.tags:['uncategorized'])
    for(const t of tags){
      if(!map.has(t)) map.set(t,[])
      map.get(t).push(it)
    }
  }
  const out=[]
  for(const [tag,arr] of map.entries()){
    const open=arr.filter(i=>i.status!=='resolved').length
    out.push({tag,open,total:arr.length,issues:arr})
  }
  return out.sort((a,b)=>b.open-a.open||a.tag.localeCompare(b.tag))
}

export default function Moderator(){
  const [issues,setIssues]=useState(()=>{
    const raw=loadIssues()
    const fixed=raw.map(i=>{
      const subject = i.subject || extractSubject(i.report||'') || ''
      const tags = (i.tags&&i.tags.length?i.tags: autoTag((i.title||'')+' '+(i.report||''), subject))
      if(subject!==i.subject || tags.join('|')!==(i.tags||[]).join('|')){
        const it=updateIssue(i.id,{subject,tags:tags.slice(0,3)})
        return it
      }
      return i
    })
    return fixed
  })
  const [activeId,setActiveId]=useState(issues.find(i=>i.status!=='resolved')?.id||null)
  const [messages,setMessages]=useState([])
  const [input,setInput]=useState('')
  const [mode,setMode]=useState('home')
  const [selectedTag,setSelectedTag]=useState(null)
  const [query,setQuery]=useState('')
  const [statusFilter,setStatusFilter]=useState('all')
  const [searchInput,setSearchInput]=useState('')

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

  function goHome(){ setActiveId(null); setMode('home'); setSelectedTag(null) }

  const groups=groupByTag(issues)
  const unresolved=issues.filter(i=>i.status!=='resolved')
  const resolved=issues.filter(i=>i.status==='resolved')

  const filteredList = useMemo(() => {
    let arr = issues
    if (selectedTag) {
      arr = arr.filter(i => (i.tags && i.tags.length ? i.tags : ['uncategorized']).includes(selectedTag))
    }
    arr = searchIssues(arr, query)
    if (statusFilter !== 'all') {
      arr = arr.filter(i => (statusFilter === 'open' ? i.status !== 'resolved' : i.status === 'resolved'))
    }
    return arr.sort((a,b) => b.createdAt - a.createdAt)
  }, [issues, selectedTag, query, statusFilter])



  function editTags(issue, raw){
    const tags=raw.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).slice(0,3)
    const valid=tags.filter(t=>t==='uncategorized'||TAXONOMY_LIST.includes(t))
    const it=updateIssue(issue.id,{tags:valid})
    setIssues(prev=>prev.map(i=>i.id===it.id?it:i))
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <button onClick={goHome} style={{background:'#64748b',marginBottom:10}}>Home</button>
        <div style={{padding:'6px 0',color:'#b91c1c',fontSize:12}}>Unresolved</div>
        {unresolved.map(i=>(
          <div key={i.id} className={'convo '+(i.id===activeId?'active':'')} onClick={()=>{setActiveId(i.id); setMode('chat')}}>{i.subject||i.title}</div>
        ))}
        <div style={{padding:'6px 0',color:'#065f46',fontSize:12}}>Resolved</div>
        {resolved.map(i=>(
          <div key={i.id} className={'convo '+(i.id===activeId?'active':'')} onClick={()=>{setActiveId(i.id); setMode('chat')}}>{i.subject||i.title}</div>
        ))}
        <div style={{marginTop:'auto',display:'flex',gap:8}}>
          <Link to="/" style={{flex:1,textAlign:'center',background:'#334155',color:'#fff',padding:'8px',borderRadius:8,textDecoration:'none'}}>Main Menu</Link>
          <Link to="/" style={{flex:1,textAlign:'center',background:'#334155',color:'#fff',padding:'8px',borderRadius:8,textDecoration:'none'}}>Log Out</Link>
        </div>
      </aside>

      <main className="main">
        {mode==='home' && (
          <div className="chat" style={{padding:'16px'}}>
            <div className="chat-inner">
              <div style={{display:'flex',gap:10,marginBottom:12}}>
                <input
                  value={searchInput}
                  onChange={e=>setSearchInput(e.target.value)}
                  onKeyDown={e=>{
                    if(e.key==='Enter'){
                      setQuery(searchInput.trim())
                      setMode('list')
                      setSelectedTag(null)
                    }
                  }}
                  placeholder='Search… examples: "oil spill" tag:waste status:open after:2025-01-01'
                  style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid #cbd5e1',background:'#fff'}}
                />
                <select
                  value={statusFilter}
                  onChange={e=>setStatusFilter(e.target.value)}
                  style={{padding:'10px',borderRadius:12,border:'1px solid #cbd5e1',background:'#fff'}}
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  onClick={()=>{
                    setQuery(searchInput.trim())
                    setMode('list')
                    setSelectedTag(null)
                  }}
                >Search</button>
                <button
                  onClick={()=>{
                    setSearchInput('')
                    setQuery('')
                    setStatusFilter('all')
                    setSelectedTag(null)
                    setMode('home')
                  }}
                  style={{background:'#64748b'}}
                >Clear</button>
              </div>

              <div className="grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
                {groups.map(g=>(
                  <div key={g.tag} className="bubble assistant" style={{cursor:'pointer'}} onClick={()=>{setSelectedTag(g.tag); setMode('list')}}>
                    <div style={{fontWeight:600,marginBottom:6}}>{g.tag.replaceAll('_',' ')}</div>
                    <div>{g.open} open / {g.total} total</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode==='list' && (
          <div className="chat">
            <div className="chat-inner">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div style={{fontSize:18,fontWeight:600}}>
                  {selectedTag ? selectedTag.replaceAll('_',' ') : 'Search results'} · {filteredList.length}
                </div>
                <button onClick={()=>{ setQuery(''); setStatusFilter('all'); setSelectedTag(null); setMode('home') }} style={{background:'#64748b'}}>Back</button>
              </div>

              {filteredList.map(i=>(
                <div key={i.id} className="bubble assistant" style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{fontWeight:600}}>{i.subject||i.title}</div>
                    <button onClick={()=>{setActiveId(i.id); setMode('chat')}}>Open</button>
                  </div>
                  <div style={{fontSize:12,opacity:.8,marginBottom:6}}>{new Date(i.createdAt).toLocaleString()}</div>
                  <div style={{fontSize:14,marginBottom:8,whiteSpace:'pre-wrap'}}>{(i.report||'').slice(0,220)}{(i.report||'').length>220?'…':''}</div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input defaultValue={(i.tags||[]).join(', ')} onBlur={e=>editTags(i,e.target.value)} placeholder="tags" style={{flex:1,padding:'8px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff'}}/>
                    <span style={{fontSize:12,opacity:.7}}>{i.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode==='chat' && (
          <>
            <div className="chat" ref={chatRef}>
              <div className="chat-inner">
                {!active && <div style={{textAlign:'center',opacity:.7,marginTop:'10vh'}}>Select an issue from the left.</div>}
                {active && (
                  <div className="bubble assistant" style={{marginBottom:10}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                      <div style={{fontWeight:600,flex:1}}>{active.subject||active.title}</div>
                      <input defaultValue={(active.tags||[]).join(', ')} onBlur={e=>editTags(active,e.target.value)} placeholder="tags" style={{padding:'6px 8px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff'}}/>
                    </div>
                    <div style={{fontSize:12,opacity:.8,marginBottom:6}}>{new Date(active.createdAt).toLocaleString()} · {active.status}</div>
                  </div>
                )}
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
                <button onClick={()=>setMode('home')} style={{background:'#64748b'}}>Dashboard</button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
