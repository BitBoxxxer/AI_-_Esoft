"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

const quickActions = [
  "Проанализируй неделю",
  "Подними настроение",
  "Дай совет по продуктивности",
  "Придумай идею для pet-проекта",
];

const memoryLevels = [
  { label: "Быстрый", value: 0, desc: "без памяти" },
  { label: "Обычный", value: 10, desc: "10 сообщений" },
  { label: "Умный", value: 25, desc: "25 сообщений" },
];

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Уровень памяти (по умолчанию 10)
  const [memory, setMemory] = useState(10);

  // Загружаем сохранённый уровень из localStorage при монтировании
  useEffect(() => {
    const saved = localStorage.getItem("chat-memory");
    if (saved) {
      const num = parseInt(saved, 10);
      if (memoryLevels.some((l) => l.value === num)) setMemory(num);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
  }, [status]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    if (!text) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, memory }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Ошибка 😞 Попробуй ещё раз." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ошибка сети." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const changeMemory = (value: number) => {
    setMemory(value);
    localStorage.setItem("chat-memory", value.toString());
  };

  if (status === "loading")
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-white animate-pulse">Загрузка...</span>
      </div>
    );

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Шапка с переключателем памяти */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/20">
            🐰
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI-советник</h1>
            <p className="text-xs text-gray-400">Всегда рядом, чтобы помочь</p>
          </div>
        </div>

        {/* Переключатель уровней памяти */}
        <div className="flex items-center gap-1">
          {memoryLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => changeMemory(level.value)}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                memory === level.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
              title={level.desc}
            >
              {level.label}
            </button>
          ))}
        </div>
      </header>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10 space-y-2">
            <div className="text-4xl">🐰💬</div>
            <p>Задай вопрос или выбери быстрое действие</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-gray-900 text-gray-100 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 text-gray-400 p-3 rounded-2xl rounded-bl-md text-sm animate-pulse">
              Печатает...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Быстрые действия (только если нет сообщений) */}
      {messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              disabled={loading}
              className="px-3 py-1.5 rounded-full text-xs bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800 hover:text-white transition"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Поле ввода */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Спроси о чём-нибудь..."
            className="flex-1 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition px-5 py-2 rounded-xl font-medium flex items-center gap-2"
          >
            <span>➤</span>
          </button>
        </div>
      </div>
    </main>
  );
}