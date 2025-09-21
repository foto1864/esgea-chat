import React, { useState, useEffect, useRef } from "react";
import "./App.css";

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

  function callAI(prompt) {
    pushMessage("assistant", "AI: I rephrased your concern → " + prompt);
  }

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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
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
