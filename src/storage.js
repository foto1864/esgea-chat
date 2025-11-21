import { db } from './firebase'
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where } from 'firebase/firestore'

const K1 = 'esgea_convos'
const ISSUES_COL = 'issues'

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function loadConvos() {
  try { return JSON.parse(localStorage.getItem(K1)) || [] } catch { return [] }
}

export function saveConvos(x) {
  localStorage.setItem(K1, JSON.stringify(x))
}

export async function loadIssues() {
  const q = query(collection(db, ISSUES_COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ΝΕΟ: issues μόνο για συγκεκριμένο clientId
export async function loadIssuesByClient(clientId) {
  if (!clientId) return []
  const q = query(collection(db, ISSUES_COL), where('clientId', '==', clientId))
  const snap = await getDocs(q)
  const issues = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  issues.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return issues
}

export async function addIssue(issue) {
  const now = Date.now()
  const base = {
    ...issue,
    tags: issue.tags || [],
    majors: issue.majors || [],
    subsByMajor: issue.subsByMajor || {},
    subject: issue.subject || '',
    status: issue.status || 'submitted',
    createdAt: now,
    updatedAt: now
  }
  const ref = await addDoc(collection(db, ISSUES_COL), base)
  return { id: ref.id, ...base }
}

export async function updateIssue(id, patch) {
  const now = Date.now()
  const ref = doc(db, ISSUES_COL, id)
  const data = { ...patch, updatedAt: now }
  await updateDoc(ref, data)
  return { id, ...data }
}
