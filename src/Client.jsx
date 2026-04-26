import { useEffect, useMemo, useRef, useState } from 'react'
import { addIssue, loadIssuesByClient } from './storage'
import { chatWithGPT, askRAG } from './ChatGPT'
import { autoTag, extractSubject } from './tagging'
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'
import { tr } from './i18n'
import LanguageSwitcher from './LanguageSwitcher'

function U(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

const EXAMPLES = {
  en: [
    'Oil spill risk near the marina from maintenance activities.',
    'Workplace safety training for dock workers seems insufficient.',
    'Board lacks independent oversight on environmental reporting.'
  ],
  el: [
    'Υπάρχει κίνδυνος διαρροής πετρελαίου κοντά στη μαρίνα λόγω εργασιών συντήρησης.',
    'Η εκπαίδευση ασφάλειας για τους εργαζόμενους στην αποβάθρα φαίνεται ανεπαρκής.',
    'Το διοικητικό συμβούλιο δεν έχει επαρκή ανεξάρτητη εποπτεία για τις περιβαλλοντικές αναφορές.'
  ],
  es: [
    'Existe riesgo de derrame de petróleo cerca de la marina por actividades de mantenimiento.',
    'La formación en seguridad laboral para los trabajadores del muelle parece insuficiente.',
    'El consejo carece de supervisión independiente sobre los informes ambientales.'
  ],
  de: [
    'Es besteht ein Risiko einer Ölverschmutzung nahe der Marina durch Wartungsarbeiten.',
    'Die Sicherheitsschulung für Hafenarbeiter scheint unzureichend zu sein.',
    'Dem Vorstand fehlt eine unabhängige Aufsicht über die Umweltberichterstattung.'
  ],
  no: [
    'Det er risiko for oljeutslipp nær marinaen på grunn av vedlikeholdsarbeid.',
    'Sikkerhetsopplæringen for havnearbeidere virker utilstrekkelig.',
    'Styret mangler uavhengig tilsyn med miljørapporteringen.'
  ]
}

const FACIL_RE = /^(I see an ESG concern\.|Κατάλαβα ότι περιγράφεις ESG)/i

async function genTitleFromFirstMessage(text, lang){
  const sys = {
    role: 'system',
    content: `You create a concise chat title in language "${lang}".
2-6 words. No punctuation, no quotes. Return only the title.
If vague, return a generic ESG category title in the same language.`
  }

  const user = { role: 'user', content: text }

  try {
    const r = await chatWithGPT([sys, user])
    const t = (r || '').split('\n')[0].trim()
    if (!t) throw new Error()
    return t.length > 60 ? t.slice(0, 60) : t
  } catch {
    const s = (text || '').trim().toLowerCase()

    if (/environment|περιβάλλον|ambiental|umwelt|miljø/.test(s)) {
      if (lang === 'el') return 'Περιβαλλοντικό Ζήτημα'
      if (lang === 'es') return 'Preocupación Ambiental'
      if (lang === 'de') return 'Umweltanliegen'
      if (lang === 'no') return 'Miljøbekymring'
      return 'Environmental Concern'
    }

    if (/safety|ασφάλεια|seguridad|sicherheit|sikkerhet/.test(s)) {
      if (lang === 'el') return 'Ζήτημα Ασφάλειας'
      if (lang === 'es') return 'Preocupación de Seguridad'
      if (lang === 'de') return 'Sicherheitsanliegen'
      if (lang === 'no') return 'Sikkerhetsbekymring'
      return 'Safety Concern'
    }

    if (/governance|board|policy|διακυβέρνηση|consejo|gobernanza|vorstand|styring/.test(s)) {
      if (lang === 'el') return 'Ζήτημα Διακυβέρνησης'
      if (lang === 'es') return 'Asunto de Gobernanza'
      if (lang === 'de') return 'Governance-Thema'
      if (lang === 'no') return 'Styringssak'
      return 'Governance Matter'
    }

    if (/social|community|stakeholder|κοινων|comunidad|gemeinschaft|sosial/.test(s)) {
      if (lang === 'el') return 'Κοινωνικό Ζήτημα'
      if (lang === 'es') return 'Preocupación Social'
      if (lang === 'de') return 'Soziales Anliegen'
      if (lang === 'no') return 'Sosial Bekymring'
      return 'Social Concern'
    }

    if (lang === 'el') return 'ESG Ερώτημα'
    if (lang === 'es') return 'Consulta ESG'
    if (lang === 'de') return 'ESG-Anfrage'
    if (lang === 'no') return 'ESG-forespørsel'
    return 'ESG Inquiry'
  }
}

export default function Client({ lang, setLang }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const t = key => tr(lang, key)
  const examples = EXAMPLES[lang] || EXAMPLES.en

  const [convos,setConvos]=useState(()=>[{id:U(),title:t('newChat'),messages:[], facilitatorArmed:false }])
  const [activeId,setActiveId]=useState(convos[0].id)
  const [input,setInput]=useState('')
  const [issues, setIssues] = useState([])

  const taRef=useRef(null)
  const MAX=240

  const active=useMemo(()=>convos.find(c=>c.id===activeId),[convos,activeId])

  useEffect(()=>{
    if(taRef.current){
      taRef.current.style.height='auto'
      const h=Math.min(taRef.current.scrollHeight,MAX)
      taRef.current.style.height=h+'px'
      taRef.current.style.overflowY=taRef.current.scrollHeight>MAX?'auto':'hidden'
    }
  },[input])

  const chatRef=useRef(null)

  useEffect(()=>{
    if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight
  },[active?.messages])

  useEffect(()=>{
    if (!user) {
      setIssues([])
      return
    }

    loadIssuesByClient(user.uid)
      .then(setIssues)
      .catch(e => {
        console.error('Error loading client issues', e)
        setIssues([])
      })
  }, [user])

  function push(role,content){
    setConvos(prev=>prev.map(c=>c.id===activeId?{...c,messages:[...c.messages,{id:U(),role,content}]}:c))
  }

  async function callAI(prompt){
    const armed = !!active?.facilitatorArmed

    push('assistant', t('thinking'))

    try {
      const recent = (active?.messages || []).slice(-8).map(m => ({ role: m.role, content: m.content }))

      const langInstruction = `
Reply language: ${lang}.
The user interface language is ${lang}.
If the user writes in another language, prefer the user's message language unless it conflicts with the selected UI language.
`

      const reply = await askRAG(
        `${langInstruction}\n\n${prompt}`,
        { citations:false, top_k:6, facilitator: armed, messages: recent }
      )

      setConvos(prev => prev.map(c => {
        if (c.id !== activeId) return c

        const newMsgs = c.messages.slice(0,-1).concat([
          {id:U(), role:'assistant', content:reply}
        ])

        let facilitatorArmed = false
        if (FACIL_RE.test(reply)) facilitatorArmed = true

        return {...c, messages:newMsgs, facilitatorArmed}
      }))

    } catch(e) {
      setConvos(prev => prev.map(c =>
        c.id===activeId
          ? {...c, messages: c.messages.slice(0,-1).concat([{id:U(), role:'assistant', content:`RAG error: ${e.message}`}])}
          : c
      ))
    }

    const userMsgCount = active.messages.filter(m=>m.role==='user').length + 1

    if(userMsgCount===1){
      const title = await genTitleFromFirstMessage(prompt, lang)
      setConvos(prev => prev.map(c => c.id===activeId ? {...c, title} : c))
    }
  }

  function onSend(){
    const text=input.trim()
    if(!text) return

    push('user',text)
    setInput('')

    setConvos(prev => prev.map(c => {
      if (c.id !== activeId) return c
      return {
        ...c,
        facilitatorArmed: c.facilitatorArmed ? false : c.facilitatorArmed,
        hasUserReply: c.fromIssue ? true : c.hasUserReply
      }
    }))

    callAI(text)
  }

  async function finalizeReport(){
    const transcript = active.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')

    const sys = {
      role:'system',
      content:`Rewrite the client's concern into a formal ESG incident report.

Language code: ${lang}.

Use these exact field labels:
From, To, Subject, Prologue, Main text, Ending.

Be concise, professional, and neutral.`
    }

    const r = await chatWithGPT([sys, {role:'user', content: transcript}])
    push('assistant', `${t('finalDraft')}\n\n${r}`)
  }

  async function submitReport(){
    const last = [...active.messages]
      .reverse()
      .find(m => m.role === 'assistant' && m.content.startsWith(t('finalDraft')))

    if(!last) return alert(t('createFinalDraftFirst'))

    const reportText = last.content.replace(new RegExp(`^${t('finalDraft')}\\s*`), '')
    const subject = extractSubject(reportText) || active.title || 'ESG Report'
    const tags = autoTag((active.title || '') + ' ' + reportText, subject)

    try {
      await addIssue({
        title: active.title || 'Report',
        subject,
        report: reportText,
        tags,
        status: 'submitted',
        clientId: user ? user.uid : null,
        clientEmail: user ? user.email : null
      })

      alert(t('reportSubmitted'))
    } catch (e) {
      console.error(e)
      alert(t('errorSubmittingReport') + ' ' + (e.message || 'unknown error'))
    }
  }

  function newChat(){
    const c={id:U(),title:t('newChat'),messages:[], facilitatorArmed:false}
    setConvos([c,...convos])
    setActiveId(c.id)
  }

  function openIssueAsConvo(issue){
    const existing = convos.find(c => c.issueId === issue.id)

    if (existing) {
      setActiveId(existing.id)
      return
    }

    const msgs = [
      {
        id: U(),
        role: 'assistant',
        content: `${t('submittedReport')}:\n\n${issue.report || `(${t('noReportTextSaved')})`}`
      }
    ]

    const c = {
      id: U(),
      title: issue.subject || issue.title || t('previousReport'),
      messages: msgs,
      facilitatorArmed: false,
      issueId: issue.id,
      fromIssue: true,
      hasUserReply: false
    }

    setConvos(prev => [c, ...prev])
    setActiveId(c.id)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-language">
            <LanguageSwitcher lang={lang} setLang={setLang} />
          </div>

          <button className="top-sidebar-btn" style={{display:'block'}} onClick={newChat}>
            {t('newChat')}
          </button>

          <div style={{padding:'6px 0',color:'#475569',fontSize:12}}>
            {t('examples')}
          </div>

          {examples.map((e,i)=>(
            <div key={i} className="convo" onClick={()=>setInput(e)}>
              {e}
            </div>
          ))}

          <div style={{padding:'6px 0',color:'#475569',fontSize:12}}>
            {t('conversations')}
          </div>

          {convos
            .filter(c => !c.fromIssue || c.hasUserReply)
            .map(c=>(
              <div
                key={c.id}
                className={'convo '+(c.id===activeId?'active':'')}
                onClick={()=>setActiveId(c.id)}
              >
                {c.title}
              </div>
            ))}

          <div style={{padding:'6px 0',color:'#475569',fontSize:12, marginTop:8}}>
            {t('submittedIssues')}
          </div>

          {issues.length === 0 && (
            <div style={{fontSize:12, opacity:.7}}>
              {t('noSubmittedIssues')}
            </div>
          )}

          {issues.map(issue => (
            <div
              key={issue.id}
              className="convo"
              onClick={() => openIssueAsConvo(issue)}
            >
              {issue.subject || issue.title || t('previousReport')}
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
        <div className="chat" ref={chatRef}>
          <div className="chat-inner">
            {active.messages.length===0 && (
              <div style={{textAlign:'center',opacity:.7,marginTop:'10vh'}}>
                {t('startConcern')}
              </div>
            )}

            {active.messages.map(m=>(
              <div key={m.id} className={'msg-row '+m.role}>
                <div className={'bubble '+m.role}>
                  <b>{m.role==='user' ? t('you') : t('assistant')}:</b> {m.content}
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
              onKeyDown={e=>{
                if(e.key==='Enter'&&!e.shiftKey){
                  e.preventDefault()
                  onSend()
                }
              }}
              placeholder={t('typeConcern')}
            />

            <button onClick={onSend}>
              {t('send')}
            </button>

            <button onClick={finalizeReport} style={{background:'#0f766e'}}>
              {t('finalize')}
            </button>

            <button onClick={submitReport} style={{background:'#10b981'}}>
              {t('submit')}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}