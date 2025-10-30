const TAXONOMY = [
  'environmental','social','governance','compliance','training','safety',
  'emissions','waste','energy','labor','diversity_inclusion','community',
  'reporting','supply_chain','risk','ethics'
]

const WORDS = {
  environmental:['environment','environmental','ecosystem','biodiversity','marine','water','pollution','spill','oil spill','recycling','recycle','waste','landfill','circular','co2','ghg','emission','footprint','energy','renewable','conservation','habitat'],
  social:['social','community','stakeholder','wellbeing','human rights','grievance','engagement'],
  governance:['governance','board','oversight','policy','whistleblow','anti-corruption','sanction','transparency'],
  compliance:['compliance','law','legal','regulation','directive','iso','csrd','esrs','eu-taxonomy'],
  training:['training','course','module','lesson','capacitation','upskill'],
  safety:['safety','ohs','incident','accident','hazard','ppe','health'],
  emissions:['emission','co2','ghg','scope 1','scope 2','scope 3','decarbon'],
  waste:['waste','recycle','recycling','landfill','circular','segregation','sorting'],
  energy:['energy','electricity','consumption','efficiency','renewable','solar','wind'],
  labor:['labor','wage','overtime','union','hours','contract','workers'],
  diversity_inclusion:['diversity','inclusion','gender','equality','non-discrimination','dei'],
  community:['community','local','donation','volunteer','outreach'],
  reporting:['report','kpi','metric','disclosure','assurance','audit','materiality','esg report'],
  supply_chain:['supplier','procurement','sourcing','vendor','chain','logistics'],
  risk:['risk','assessment','register','mitigation','likelihood','impact'],
  ethics:['ethics','anti-bribery','fraud','corruption','code of conduct']
}

const PHRASES = [
  {rx:/\boil\s+spill(s)?\b/i, tag:'environmental'},
  {rx:/\brecycling?|recyclable|waste\s+segregation\b/i, tag:'waste'},
  {rx:/\bspill\s+response|containment\b/i, tag:'safety'},
  {rx:/\bcsrd|esrs|eu[-\s]?taxonomy\b/i, tag:'compliance'},
  {rx:/\bscope\s*(1|2|3)\b/i, tag:'emissions'}
]

function scoreOne(text, needles){
  let s=0
  for(const n of needles){
    const r = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i')
    if(r.test(text)) s+=2
    else if(text.includes(n)) s+=1
  }
  return s
}

export function autoTag(raw, subject){
  const text=(raw||'').toLowerCase()
  const subj=(subject||'').toLowerCase()
  const boost = subj ? 2 : 0
  const hits = {}
  for(const p of PHRASES){ if(p.rx.test(raw)) hits[p.tag]=(hits[p.tag]||0)+3 }
  for(const tag of Object.keys(WORDS)){
    let s=scoreOne(text, WORDS[tag])
    s += boost*scoreOne(subj, WORDS[tag])
    if(s>0) hits[tag]=(hits[tag]||0)+s
  }
  const arr=Object.entries(hits).sort((a,b)=>b[1]-a[1]).map(x=>x[0])
  const out=arr.slice(0,3)
  return out.length?out:['environmental']
}

export function extractSubject(report){
  if(!report) return ''
  const m = report.match(/\*\*Subject:\*\*\s*(.+)/i) || report.match(/Subject:\s*(.+)/i)
  if(!m) return ''
  return m[1].trim().replace(/\*\*/g,'').replace(/\s{2,}/g,' ')
}

export const TAXONOMY_LIST = TAXONOMY
