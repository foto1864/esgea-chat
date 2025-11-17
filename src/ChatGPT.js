const API_BASE = process.env.REACT_APP_API_BASE || "api";
const API_MODE = process.env.REACT_APP_API_MODE || "php"; // "php" or "node"

export async function chatWithGPT(messages) {
  const endpoint =
    API_MODE === "node"
      ? `${API_BASE}/chat`
      : `${API_BASE}/chat.php`;

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
    facilitator = false,
  } = opts;

  const base = API_BASE;
  const url =
    API_MODE === "node"
      ? `${base}/rag/ask`
      : `${base}/rag_ask.php`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, citations, top_k, facilitator }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAG HTTP ${res.status} – ${text}`);
  }

  const data = await res.json();
  return data?.answer ?? "(no answer)";
}