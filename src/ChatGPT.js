export async function chatWithGPT(messages) {
  const res = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Proxy error ${res.status}: ${t}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "(no content)";
}
