function toTs(s){ const d=new Date(s); return isNaN(d.getTime())?null:d.getTime() }
function norm(s){ return (s||'').toLowerCase() }

export function searchIssues(issues, query){
  const q=(query||'').trim()
  if(!q) return issues
  const tokens=[]
  const rx=/("([^"]+)"|\S+)/g
  let m
  while((m=rx.exec(q))){ tokens.push(m[2]||m[1]) }

  const filters={ tags:[], text:[], status:null, after:null, before:null }
  for(const t of tokens){
    const low=t.toLowerCase()
    if(low.startsWith('tag:')) filters.tags.push(low.slice(4))
    else if(low.startsWith('status:')) filters.status=low.slice(7)
    else if(low.startsWith('after:')) filters.after=toTs(low.slice(6))
    else if(low.startsWith('before:')) filters.before=toTs(low.slice(7))
    else filters.text.push(low.replace(/^"|"$/g,''))
  }

  return issues.filter(it=>{
    const subj=norm(it.subject)
    const title=norm(it.title)
    const report=norm(it.report)
    if(filters.status){
      const open=it.status!=='resolved'
      if(filters.status==='open' && !open) return false
      if(filters.status==='resolved' && open) return false
    }
    if(filters.after && !(it.createdAt>=filters.after)) return false
    if(filters.before && !(it.createdAt<=filters.before)) return false
    if(filters.tags.length){
      const tg=(it.tags||[]).map(x=>x.toLowerCase())
      for(const need of filters.tags){
        if(!tg.includes(need)) return false
      }
    }
    if(filters.text.length){
      for(const term of filters.text){
        const hit = subj.includes(term) || title.includes(term) || report.includes(term)
        if(!hit) return false
      }
    }
    return true
  })
}
