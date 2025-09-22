import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { chatWithGPT } from "./ChatGPT";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const emptyConversation = () => ({
  id: uid(),
  title: "New chat",
  messages: [],
});

function App() {
  const [convos, setConvos] = useState([emptyConversation()]);
  const [activeId, setActiveId] = useState(convos[0].id);
  const [input, setInput] = useState("");
  const taRef = useRef(null)
  const MAX_TA_HEIGHT = 100  // px
  const chatRef = useRef(null);

  const active = convos.find((c) => c.id === activeId);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [active?.messages]);

  function pushMessage(role, content) {
    setConvos((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, { id: uid(), role, content }] }
          : c
      )
    );
  }

  function autosizeTextarea(el) {
  if (!el) return
  el.style.height = 'auto'
  const next = Math.min(el.scrollHeight, MAX_TA_HEIGHT)
  el.style.height = next + 'px'
  el.style.overflowY = el.scrollHeight > MAX_TA_HEIGHT ? 'auto' : 'hidden'
  }
  
  async function generateTitle(firstUserMsg) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that creates short, 1–3 word titles for a chat based on the user's first message.",
          },
          { role: "user", content: firstUserMsg },
        ],
        max_tokens: 10,
      }),
    }).then((r) => r.json());

    return r.choices[0].message.content.trim();
  }


  async function callAI(prompt) {
    pushMessage("assistant", "Thinking…");

    const messages = [
      ...active.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ];

    const reply = await chatWithGPT(messages);

    setConvos((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;

        const newMessages = c.messages.slice(0, -1).concat([
          { id: uid(), role: "assistant", content: reply },
        ]);

        return { ...c, messages: newMessages };
      })
    );

    // 👉 if this is the first user message, generate a title
    if (active.messages.filter((m) => m.role === "user").length === 0) {
      const title = await generateTitle(prompt);

      setConvos((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, title } : c
        )
      );
    }
  }

  useEffect(() => { autosizeTextarea(taRef.current) }, [])

  function onSend() {
    if (!input.trim()) return;
    pushMessage("user", input.trim());
    callAI(input.trim());
    setInput("");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <button onClick={() => {
          const c = emptyConversation();
          setConvos([c, ...convos]);
          setActiveId(c.id);
        }}>
          + New Chat
        </button>
        {convos.map((c) => (
          <div
            key={c.id}
            className={c.id === activeId ? "convo active" : "convo"}
            onClick={() => setActiveId(c.id)}
          >
            {c.title}
          </div>
        ))}
      </aside>

      <main className="main">
        <div className="chat" ref={chatRef}>
          <div className="chat-inner">
            {active.messages.map((m) => (
              <div key={m.id} className={`msg-row ${m.role}`}>
                <div className={`bubble ${m.role}`}>
                  <b>{m.role === "user" ? "You" : "Assistant"}:</b> {m.content}
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
              onChange={(e) => { setInput(e.target.value); autosizeTextarea(e.target) }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() }
              }}
              placeholder="Type your concern..."
            />

            <button onClick={onSend}>Send</button>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
