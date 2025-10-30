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
