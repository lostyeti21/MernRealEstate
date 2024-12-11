import { useState } from "react";

function Chatbot() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();

      const botMessage = { sender: "bot", text: data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, something went wrong." },
      ]);
    }

    setInput("");
  };

  return (
    <div>
      <div className="fixed bottom-4 right-4">
        <button
          className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        >
          💬
        </button>
      </div>

      {isChatbotOpen && (
        <div className="fixed bottom-16 right-4 bg-white p-4 shadow-lg w-80 h-96 rounded-lg">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Chatbot</h2>
            <button
              className="text-red-500 font-bold"
              onClick={() => setIsChatbotOpen(false)}
            >
              ✖
            </button>
          </div>
          <div className="mt-4 overflow-auto h-[calc(100%-80px)]">
            <div className="flex flex-col gap-2">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`${
                    msg.sender === "user"
                      ? "text-right text-blue-600"
                      : "text-left text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex">
            <input
              className="flex-grow border p-2 rounded-l-lg"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
            />
            <button
              className="bg-blue-500 text-white px-4 rounded-r-lg"
              onClick={handleSend}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chatbot;
