
export async function chatWithGPT(messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo", // or gpt-4o-mini if you have it
      messages: messages,
    }),
  });

  const data = await res.json();
  return data.choices[0].message.content;
}
