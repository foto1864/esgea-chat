const API_BASE = process.env.REACT_APP_API_BASE || "api";

export async function chatWithGPT(messages) {
  // CRA automatically injects process.env.REACT_APP_ variables
  // Dev: http://localhost:3001/api/chat
  // Prod: api/chat.php
  const endpoint =
    API_BASE.endsWith("/api") ? `${API_BASE}/chat` : `${API_BASE}/chat.php`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} – ${text}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "(no content)";
}

export async function askRAG(question, opts = {}) {
  const {
    citations = false,
    top_k = 6,
    facilitator = false, // <-- new flag is accepted here
  } = opts;

  const base = process.env.REACT_APP_API_BASE || "api";
  const url = base.endsWith("/api") ? `${base}/rag/ask` : `${base}/rag_ask.php`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, citations, top_k, facilitator }), // <-- send it
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAG HTTP ${res.status} – ${text}`);
  }
  const data = await res.json(); // { answer: "..." }
  return data?.answer ?? "(no answer)";
}


