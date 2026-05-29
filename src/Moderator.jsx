import { useEffect, useMemo, useRef, useState } from 'react'
import { loadIssues, updateIssue } from './storage'
import { askRAG } from './ChatGPT' // <-- use RAG
import { TAXONOMY_LIST, extractSubject, categorizeIssueESG, ESG_STRUCTURE } from './tagging'
import { searchIssues } from './search'
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'
import { tr, taxLabel } from './i18n'
import LanguageSwitcher from './LanguageSwitcher'

function U(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

export default function Moderator({ lang, setLang }) {
  // Firebase
  const { logout } = useAuth()
  const navigate = useNavigate()
  // Functionality
  const [issues, setIssues] = useState([])
  const [issuesLoading, setIssuesLoading] = useState(true)
  // Translations
  const t = key => tr(lang, key)
  const label = key => taxLabel(lang, key)

  const [activeId,setActiveId]=useState(issues.find(i=>i.status!=='resolved')?.id||null)
  const [messages,setMessages]=useState([])
  const [input,setInput]=useState('')
  const [mode,setMode]=useState('home')

  const [selectedTag,setSelectedTag]=useState(null)
  const [selectedMajor,setSelectedMajor]=useState(null) // NEW

  const [query,setQuery]=useState('')
  const [statusFilter,setStatusFilter]=useState('all')
  const [searchInput,setSearchInput]=useState('')

  const taRef=useRef(null)
  const MAX=240
  useEffect(()=>{ if(taRef.current){ taRef.current.style.height='auto'; const h=Math.min(taRef.current.scrollHeight,MAX); taRef.current.style.height=h+'px'; taRef.current.style.overflowY=taRef.current.scrollHeight>MAX?'auto':'hidden'}},[input])
  const active=useMemo(()=>issues.find(i=>i.id===activeId)||null,[issues,activeId])
  const chatRef=useRef(null)
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight },[messages])

  // seed thread with the submitted report
  useEffect(()=>{
    if(!active){ setMessages([]); return }
    const seed=[
      {id:U(),role:'assistant',content:'A client has submitted the report below. Ask questions or request a plan and I’ll ground answers in eSgEA training.'},
      {id:U(),role:'assistant',content:active.report}
    ]
    setMessages(seed)
  },[active])

  useEffect(() => {
    let cancelled = false

    async function fetchIssues() {
      try {
        const raw = await loadIssues()
        const fixed = raw.map(i => {
          const subject = i.subject || extractSubject(i.report || '') || ''
          const cat = categorizeIssueESG(
            (i.title || '') + ' ' + (i.report || ''),
            subject
          )

          const tags =
            i.majors && i.majors.length && i.tags && i.tags.length
              ? i.tags.slice(0, 5)
              : cat.subcategories.slice(0, 5)

          const majors =
            i.majors && i.majors.length
              ? i.majors
              : cat.majors

          const subsByMajor =
            i.subsByMajor && Object.keys(i.subsByMajor).length
              ? i.subsByMajor
              : cat.subsByMajor

          return {
            ...i,
            subject,
            tags,
            majors,
            subsByMajor
          }
        })
        if (!cancelled) setIssues(fixed)
      } finally {
        if (!cancelled) setIssuesLoading(false)
      }
    }

    fetchIssues()
    return () => { cancelled = true }
  }, [])



  function push(role,content){ setMessages(prev=>[...prev,{id:U(),role,content}]) }

  async function onSend(){
    const text=input.trim()
    if(!text||!active) return
    push('user',text)
    setInput('')
    push('assistant','Thinking…')

    // Build a single RAG question that includes the submitted report + moderator prompt.
    // The PHP rag_ask uses its own system prompt; here we set intent & audience inside the "question" string.
    const composedQuestion =
`Moderator follow-up on a submitted ESG report. Please weave at least two relevant sections inline and keep the “From training” footer.

Audience: site manager / supervisor.
Goal: give clear, grounded rationale and practical next steps. Keep it conversational (short paragraphs), reference eSgEA sections inline when relevant, and end with one open question to move the case forward.

Submitted report:
${active.report || '(no report text)'}

Moderator question:
${text}`

    try{
      const reply = await askRAG(composedQuestion, { citations: false, top_k: 10 })
      setMessages(prev=>prev.slice(0,-1).concat([{id:U(),role:'assistant',content:reply}]))
    }catch(e){
      setMessages(prev=>prev.slice(0,-1).concat([{id:U(),role:'assistant',content:`RAG error: ${e.message}`}]))
    }
  }

  async function toggleStatus(){
    if(!active) return
    const nextStatus = active.status === 'resolved' ? 'submitted' : 'resolved'
    const patch = { status: nextStatus }
    const it = await updateIssue(active.id, patch)
    setIssues(prev => prev.map(i => i.id === active.id ? { ...i, ...it } : i))
  }


  function goHome(){
    setActiveId(null)
    setMode('home')
    setSelectedTag(null)
    setSelectedMajor(null) // NEW
  }


  const unresolved=issues.filter(i=>i.status!=='resolved')

  const majorsSummary = useMemo(() => {
  const base = [
    { major: 'environmental', open: 0, total: 0 },
    { major: 'social', open: 0, total: 0 },
    { major: 'governance', open: 0, total: 0 }
  ]
  const byKey = Object.fromEntries(base.map(x => [x.major, x]))
  for (const it of issues) {
    const majors = it.majors || []
    for (const m of majors) {
      if (!byKey[m]) continue
      byKey[m].total += 1
      if (it.status !== 'resolved') byKey[m].open += 1
    }
  }
  return base
  }, [issues])

  const subSummaries = useMemo(() => {
  const res = {}
  const majors = ['environmental','social','governance']

  for (const major of majors) {
    const subs = ESG_STRUCTURE.subcategories[major] || []
    const arr = subs.map(sub => ({ sub, open: 0, total: 0 }))
    const byKey = Object.fromEntries(arr.map(x => [x.sub, x]))

    for (const it of issues) {
      const majorsOfIssue = it.majors || []
      if (!majorsOfIssue.includes(major)) continue

      const subsForIssue =
        (it.subsByMajor && it.subsByMajor[major]) ||
        (it.tags || []).filter(t => subs.includes(t))

      for (const s of subsForIssue) {
        const bucket = byKey[s]
        if (!bucket) continue
        bucket.total += 1
        if (it.status !== 'resolved') bucket.open += 1
      }
    }

    res[major] = arr
    }

    return res
  }, [issues])

  const resolved=issues.filter(i=>i.status==='resolved')

  const filteredList = useMemo(() => {
    let arr = issues

    if (selectedMajor) {
      arr = arr.filter(i => (i.majors || []).includes(selectedMajor))
    }

    if (selectedTag) {
      arr = arr.filter(i => {
        const subsForMajor =
          (i.subsByMajor && selectedMajor && i.subsByMajor[selectedMajor]) || []

        const tagArr = (i.tags && i.tags.length ? i.tags : [])

        return subsForMajor.includes(selectedTag) || tagArr.includes(selectedTag)
      })
    }

    arr = searchIssues(arr, query)

    if (statusFilter !== 'all') {
      arr = arr.filter(i =>
        statusFilter === 'open' ? i.status !== 'resolved' : i.status === 'resolved'
      )
    }

    return arr.sort((a,b) => b.createdAt - a.createdAt)
  }, [issues, selectedTag, selectedMajor, query, statusFilter])



  async function editTags(issue, raw){
    const tags = raw.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).slice(0,5)
    const valid = tags.filter(t => t === 'uncategorized' || TAXONOMY_LIST.includes(t))
    const it = await updateIssue(issue.id, { tags: valid })
    setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, ...it } : i))
  }


  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-language">
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </div>
          <button className='top-sidebar-btn' onClick={goHome} style={{background:'#64748b',marginBottom:10}}>{t('home')}</button>

          <div style={{padding:'6px 0',color:'#b91c1c',fontSize:12}}>{t('unresolved')}</div>
          {unresolved.map(i=>(
            <div
              key={i.id}
              className={'convo '+(i.id===activeId?'active':'')}
              onClick={()=>{setActiveId(i.id); setMode('chat')}}
            >
              {i.subject||i.title}
            </div>
          ))}

          <div style={{padding:'6px 0',color:'#065f46',fontSize:12}}>{t('resolved')}</div>
          {resolved.map(i=>(
            <div
              key={i.id}
              className={'convo '+(i.id===activeId?'active':'')}
              onClick={()=>{setActiveId(i.id); setMode('chat')}}
            >
              {i.subject||i.title}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button
            onClick={async ()=>{ await logout(); navigate('/', { replace:true }) }}
            className="sidebar-footer-btn"
          >
            {t('mainMenu')}
          </button>
          <button
            onClick={async ()=>{ await logout(); navigate('/', { replace:true }) }}
            className="sidebar-footer-btn"
          >
            {t('logOut')}
          </button>
        </div>
      </aside>

      <main className="main">
        {mode==='home' && (
          <div className="chat" style={{padding:'16px'}}>
            <div className="chat-inner">
              <div className="moderator-filters" style={{display:'flex',gap:10,marginBottom:12}}>
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
                  <option value="all">{t('all')}</option>
                  <option value="open">{t('home')}</option>
                  <option value="resolved">{t('resolved')}</option>
                </select>
                <button
                  onClick={()=>{
                    setQuery(searchInput.trim())
                    setMode('list')
                    setSelectedTag(null)
                  }}
                >{t('search')}</button>
                <button
                  onClick={()=>{
                    setSearchInput('')
                    setQuery('')
                    setStatusFilter('all')
                    setSelectedTag(null)
                    setSelectedMajor(null) // NEW
                    setMode('home')
                  }}
                  style={{background:'#64748b'}}
                >{t('search')}</button>
              </div>

              {issuesLoading && (
                <div style={{textAlign:'center',opacity:.7,marginTop:'4px',marginBottom:'12px'}}>
                  {t('loadingIssues')}
                </div>
              )}
                <div
                  className="grid"
                  style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}
                >
                  {majorsSummary.map(m => (
                    <div
                      key={m.major}
                      className="bubble assistant"
                      style={{cursor:'pointer'}}
                      onClick={() => {
                        setSelectedMajor(m.major)
                        setSelectedTag(null)
                        setMode('list')
                      }}
                    >
                      <div style={{fontWeight:600,marginBottom:6}}>
                        {label(m.major)}
                      </div>
                      <div>{m.open} {t('open')} / {m.total} {t('total')}</div>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        )}

        {mode==='list' && (
          <div className="chat">
            <div className="chat-inner">
              <div className="list-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div style={{fontSize:24,fontWeight:600}}>
                  {selectedTag
                    ? selectedTag.replaceAll('_',' ')
                    : selectedMajor
                      ? (ESG_STRUCTURE.majors[selectedMajor] || selectedMajor)
                      : 'Search results'
                  } · {filteredList.length} {t('issuesInTotal')}
                </div>

                <button
                  onClick={()=>{
                    setQuery('')
                    setStatusFilter('all')
                    setSelectedTag(null)
                    setSelectedMajor(null)
                    setMode('home')
                  }}
                  style={{background:'#64748b'}}
                >
                  {t('back')}
                </button>
              </div>

              {selectedMajor && (
                <div
                  className="grid"
                  style={{
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',
                    gap:8,
                    marginBottom:12,
                    marginTop: 25
                  }}
                >
                  {(subSummaries[selectedMajor] || []).map(s => (
                    <div
                      key={s.sub}
                      className="bubble assistant"
                      style={{cursor:'pointer'}}
                      onClick={() => {
                        setSelectedTag(s.sub)
                      }}
                    >
                      <div style={{fontWeight:600,marginBottom:4}}>
                        {label(s.sub)}
                      </div>
                      <div style={{fontSize:12}}>
                        {s.open} {t('open')} / {s.total} {t('total')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{fontSize:24,fontWeight:600, marginBottom: 25, marginTop: 50}}>{t('allIssues')}</div>

              {filteredList.map(i=>(
                <div key={i.id} className="bubble assistant" style={{marginBottom:10}}>
                  <div className="issue-card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{fontWeight:600}}>{i.subject||i.title}</div>
                    <button onClick={()=>{setActiveId(i.id); setMode('chat')}} style={{marginLeft: 15}}>{t('open')}</button>
                  </div>
                  <div style={{fontSize:12,opacity:.8,marginBottom:6}}>{new Date(i.createdAt).toLocaleString()}</div>
                  <div style={{fontSize:14,marginBottom:8,whiteSpace:'pre-wrap'}}>
                    {(i.report||'').slice(0,220)}{(i.report||'').length>220?'…':''}
                  </div>
                  <div className="tag-editor-row" style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input
                      defaultValue={(i.tags||[]).join(', ')}
                      onBlur={e=>editTags(i,e.target.value)}
                      placeholder="tags"
                      style={{flex:1,padding:'8px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff'}}
                    />
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
                {issuesLoading && !active && (
                  <div style={{textAlign:'center',opacity:.7,marginTop:'10vh'}}>
                    {t('loadingIssues')}
                  </div>
                )}
                {!issuesLoading && !active && (
                  <div style={{textAlign:'center',opacity:.7,marginTop:'10vh'}}>
                    {t('selectIssue')}
                  </div>
                )}
                {active && (
                  <div className="bubble assistant" style={{marginBottom:10}}>
                    <div className="issue-detail-header" style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                      <div style={{fontWeight:600,flex:1}}>{active.subject||active.title}</div>
                      <input
                        defaultValue={(active.tags||[]).join(', ')}
                        onBlur={e=>editTags(active,e.target.value)}
                        placeholder="tags"
                        style={{padding:'6px 8px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff'}}
                      />
                    </div>
                    <div style={{fontSize:12,opacity:.8,marginBottom:6}}>
                      {new Date(active.createdAt).toLocaleString()} · {active.status}
                    </div>
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
                <button onClick={onSend} disabled={!active}>{t('send')}</button>
                <button
                  onClick={toggleStatus}
                  style={{background:active&&active.status==='resolved'?'#f59e0b':'#10b981'}}
                  disabled={!active}
                >
                  {active && active.status === 'resolved' ? t('markUnresolved') : t('markResolved')}
                </button>
                <button onClick={()=>setMode('home')} style={{background:'#64748b'}}>{t('dashboard')}</button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )

}
