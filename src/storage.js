const K1 = 'esgea_convos'
const K2 = 'esgea_issues'

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function loadConvos() {
  try { return JSON.parse(localStorage.getItem(K1)) || [] } catch { return [] }
}

export function saveConvos(x) {
  localStorage.setItem(K1, JSON.stringify(x))
}

export function loadIssues() {
  try { return JSON.parse(localStorage.getItem(K2)) || [] } catch { return [] }
}

export function saveIssues(x) {
  localStorage.setItem(K2, JSON.stringify(x))
}

export function addIssue(issue) {
  const all = loadIssues()
  const it = { ...issue, id: uid(), tags: issue.tags || [], subject: issue.subject || '', status: 'submitted', createdAt: Date.now(), updatedAt: Date.now() }
  const next = [it, ...all]
  saveIssues(next)
  return it
}

export function updateIssue(id, patch) {
  const all = loadIssues()
  const next = all.map(i => i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i)
  saveIssues(next)
  return next.find(i => i.id === id)
}
