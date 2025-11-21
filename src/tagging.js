const MAJORS = {
  environmental: 'Environmental',
  social: 'Social',
  governance: 'Governance'
}

const SUBCATEGORIES = {
  environmental: [
    'climate_emissions',
    'energy',
    'water',
    'waste_circularity',
    'biodiversity_land_use',
    'pollution',
    'supply_chain_environment'
  ],
  social: [
    'labor_employment',
    'health_safety_wellbeing',
    'dei',
    'human_rights',
    'community_social_impact',
    'product_customer_welfare',
    'talent_development'
  ],
  governance: [
    'board_oversight',
    'ethics_anti_corruption',
    'risk_compliance',
    'data_privacy_cybersecurity',
    'executive_remuneration',
    'transparency_reporting',
    'supply_chain_governance'
  ]
}

const SUBCATEGORY_LABELS = {
  climate_emissions: 'Climate & Emissions',
  energy: 'Energy',
  water: 'Water',
  waste_circularity: 'Waste & Circularity',
  biodiversity_land_use: 'Biodiversity & Land Use',
  pollution: 'Pollution',
  supply_chain_environment: 'Supply Chain (Environment)',

  labor_employment: 'Labor & Employment',
  health_safety_wellbeing: 'Health, Safety & Wellbeing',
  dei: 'Diversity, Equity & Inclusion (DEI)',
  human_rights: 'Human Rights',
  community_social_impact: 'Community & Social Impact',
  product_customer_welfare: 'Product Responsibility & Customer Welfare',
  talent_development: 'Talent Development',

  board_oversight: 'Board & Oversight',
  ethics_anti_corruption: 'Ethics & Anti-Corruption',
  risk_compliance: 'Risk Management & Compliance',
  data_privacy_cybersecurity: 'Data Privacy & Cybersecurity',
  executive_remuneration: 'Executive Remuneration & Incentives',
  transparency_reporting: 'Transparency & Reporting',
  supply_chain_governance: 'Supply Chain Management (Governance)'
}

const SUBCATEGORY_TO_MAJOR = (() => {
  const m = {}
  for (const major of Object.keys(SUBCATEGORIES)) {
    for (const sub of SUBCATEGORIES[major]) {
      m[sub] = major
    }
  }
  return m
})()

const WORDS = {
  climate_emissions: [
    'climate',
    'global warming',
    'temperature target',
    'co2',
    'ghg',
    'greenhouse gas',
    'emission',
    'emissions',
    'scope 1',
    'scope 2',
    'scope 3',
    'carbon',
    'decarbon',
    'net zero',
    'carbon footprint'
  ],
  energy: [
    'energy',
    'electricity',
    'fuel',
    'diesel',
    'gasoline',
    'consumption',
    'efficiency',
    'energy saving',
    'renewable',
    'solar',
    'wind',
    'heat',
    'lighting'
  ],
  water: [
    'water',
    'water use',
    'water management',
    'wastewater',
    'sewage',
    'discharge',
    'stormwater',
    'leak',
    'leakage'
  ],
  waste_circularity: [
    'waste',
    'recycle',
    'recycling',
    'recyclable',
    'landfill',
    'circular',
    'circularity',
    'segregation',
    'sorting',
    'reuse',
    'compost'
  ],
  biodiversity_land_use: [
    'biodiversity',
    'habitat',
    'ecosystem',
    'species',
    'flora',
    'fauna',
    'land use',
    'deforestation',
    'reforestation',
    'wetland',
    'marine',
    'coastal'
  ],
  pollution: [
    'pollution',
    'spill',
    'oil spill',
    'air quality',
    'noise',
    'odour',
    'contamination',
    'leak',
    'chemicals'
  ],
  supply_chain_environment: [
    'supplier',
    'procurement',
    'sourcing',
    'vendor',
    'logistics',
    'transport',
    'fleet',
    'upstream',
    'downstream',
    'environmental requirement',
    'environmental criteria'
  ],

  labor_employment: [
    'labor',
    'labour',
    'employment',
    'employee',
    'wage',
    'salary',
    'overtime',
    'work hours',
    'shift',
    'contract',
    'union',
    'collective agreement',
    'hiring',
    'firing'
  ],
  health_safety_wellbeing: [
    'safety',
    'health',
    'ohs',
    'occupational',
    'incident',
    'accident',
    'hazard',
    'near miss',
    'ppe',
    'wellbeing',
    'fatigue',
    'stress',
    'injury'
  ],
  dei: [
    'diversity',
    'inclusion',
    'inclusive',
    'equity',
    'equality',
    'gender',
    'dei',
    'non-discrimination',
    'harassment',
    'bullying'
  ],
  human_rights: [
    'human rights',
    'forced labor',
    'child labor',
    'child labour',
    'modern slavery',
    'freedom of association',
    'right to',
    'abuse',
    'exploitation'
  ],
  community_social_impact: [
    'community',
    'local community',
    'social impact',
    'donation',
    'sponsorship',
    'volunteer',
    'outreach',
    'neighbour',
    'neighborhood',
    'stakeholder engagement'
  ],
  product_customer_welfare: [
    'customer',
    'client',
    'product safety',
    'product quality',
    'complaint',
    'recall',
    'misleading',
    'marketing',
    'data on product use',
    'user safety'
  ],
  talent_development: [
    'training',
    'course',
    'module',
    'lesson',
    'upskill',
    'reskill',
    'capacity building',
    'talent',
    'development program',
    'career',
    'performance review'
  ],

  board_oversight: [
    'board',
    'board of directors',
    'oversight',
    'supervisory',
    'governance structure',
    'committee',
    'esg committee'
  ],
  ethics_anti_corruption: [
    'ethics',
    'ethical',
    'code of conduct',
    'anti-bribery',
    'anti bribery',
    'bribe',
    'corruption',
    'fraud',
    'whistleblow',
    'whistle-blow',
    'sanction',
    'conflict of interest'
  ],
  risk_compliance: [
    'risk',
    'risk assessment',
    'risk register',
    'mitigation',
    'likelihood',
    'impact',
    'compliance',
    'law',
    'legal',
    'regulation',
    'directive',
    'iso',
    'csrd',
    'esrs',
    'eu-taxonomy',
    'eu taxonomy'
  ],
  data_privacy_cybersecurity: [
    'data',
    'privacy',
    'gdpr',
    'personal data',
    'cyber',
    'cybersecurity',
    'information security',
    'breach',
    'hack',
    'phishing'
  ],
  executive_remuneration: [
    'executive',
    'management bonus',
    'remuneration',
    'incentive',
    'stock option',
    'variable pay'
  ],
  transparency_reporting: [
    'report',
    'reporting',
    'disclosure',
    'kpi',
    'metric',
    'assurance',
    'audit',
    'materiality',
    'esg report',
    'non-financial report',
    'sustainability report'
  ],
  supply_chain_governance: [
    'supplier code of conduct',
    'supplier audit',
    'third party due diligence',
    'screening',
    'vendor assessment',
    'supply chain governance'
  ]
}

const PHRASES = [
  { rx: /\boil\s+spill(s)?\b/i, sub: 'pollution' },
  { rx: /\brecycling?|recyclable|waste\s+segregation\b/i, sub: 'waste_circularity' },
  { rx: /\bspill\s+response|containment\b/i, sub: 'pollution' },
  { rx: /\bcsrd|esrs|eu[-\s]?taxonomy\b/i, sub: 'risk_compliance' },
  { rx: /\bscope\s*(1|2|3)\b/i, sub: 'climate_emissions' }
]

function scoreOne(text, needles) {
  let s = 0
  for (const n of needles) {
    const r = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i')
    if (r.test(text)) s += 2
    else if (text.includes(n)) s += 1
  }
  return s
}

function computeSubcategoryHits(raw, subject) {
  const text = (raw || '').toLowerCase()
  const subj = (subject || '').toLowerCase()
  const boost = subj ? 2 : 0
  const hits = {}

  for (const p of PHRASES) {
    if (p.rx.test(raw)) hits[p.sub] = (hits[p.sub] || 0) + 3
  }

  for (const sub of Object.keys(WORDS)) {
    let s = scoreOne(text, WORDS[sub])
    s += boost * scoreOne(subj, WORDS[sub])
    if (s > 0) hits[sub] = (hits[sub] || 0) + s
  }

  return hits
}

export function categorizeIssueESG(raw, subject) {
  const hits = computeSubcategoryHits(raw, subject)

  let entries = Object.entries(hits).sort((a, b) => b[1] - a[1])

  if (entries.length) {
    const bestScore = entries[0][1]
    entries = entries.filter(([_, score]) => score >= bestScore * 0.5)
  }

  const allSubsSorted = entries.map(([sub]) => sub)

  const chosenSubs = allSubsSorted.slice(0, 5)
  const subcategories = chosenSubs.length ? chosenSubs : []

  const majorScores = {}
  for (const [sub, score] of entries) {
    const major = SUBCATEGORY_TO_MAJOR[sub]
    if (!major) continue
    majorScores[major] = (majorScores[major] || 0) + score
  }

  let majors = Object.entries(majorScores)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m)

  if (!majors.length) majors = ['environmental']

  const bestMajorScore = majors.length ? majorScores[majors[0]] : 0
  const selectedMajors = majors.filter(
    m => majorScores[m] && majorScores[m] >= bestMajorScore * 0.5
  )

  const subsByMajor = {}
  for (const sub of chosenSubs) {
    const major = SUBCATEGORY_TO_MAJOR[sub]
    if (!major || !selectedMajors.includes(major)) continue
    if (!subsByMajor[major]) subsByMajor[major] = []
    subsByMajor[major].push(sub)
  }

  if (!subcategories.length) subcategories.push('climate_emissions')

  return { majors: selectedMajors, subsByMajor, subcategories }
}


export function autoTag(raw, subject) {
  return categorizeIssueESG(raw, subject).subcategories.slice(0, 5)
}

export function extractSubject(report) {
  if (!report) return ''
  const m = report.match(/\*\*Subject:\*\*\s*(.+)/i) || report.match(/Subject:\s*(.+)/i)
  if (!m) return ''
  return m[1].trim().replace(/\*\*/g,'').replace(/\s{2,}/g,' ')
}

export const ESG_STRUCTURE = {
  majors: MAJORS,
  subcategories: SUBCATEGORIES,
  labels: SUBCATEGORY_LABELS
}

export const TAXONOMY_LIST = Object.keys(SUBCATEGORY_LABELS)
