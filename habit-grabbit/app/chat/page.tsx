"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useRef, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import SignOutButton from "@/components/SignOutButton";

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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ChatPage() {
  const status = useRequireAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Загрузка списка диалогов
  const fetchConversations = useCallback(async () => {
    const res = await apiFetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
      if (data.length > 0 && !activeConvId) {
        setActiveConvId(data[0].id);
      }
    }
  }, [activeConvId]);

  useEffect(() => {
    if (status === "authenticated") fetchConversations();
  }, [status, fetchConversations]);

  // Загрузка сообщений при смене диалога
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      const res = await apiFetch(`/api/conversations/${activeConvId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    };
    loadMessages();
  }, [activeConvId]);

  const createNewConversation = async () => {
    const res = await apiFetch("/api/conversations", { method: "POST" });
    if (res.ok) {
      const conv = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading || !activeConvId) return;

    if (!text) setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: messageText }]);
    setLoading(true);

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, memory, conversationId: activeConvId }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev.slice(0, -1), // убираем временное user-сообщение
          { id: data.userMessageId, role: "user", content: messageText },
          { id: data.messageId, role: "assistant", content: data.reply },
        ]);
        fetchConversations(); // обновить заголовок и дату
      } else {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { id: "error", role: "assistant", content: "Ошибка 😞 Попробуй ещё раз." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { id: "error", role: "assistant", content: "Ошибка сети." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      const res = await apiFetch(`/api/messages/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        // Обновляем локальные сообщения: удаляем все после редактируемого и заменяем содержимое
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === editingId);
          if (idx === -1) return prev;
          const updated = [...prev.slice(0, idx), { ...prev[idx], content: editContent }];
          return updated;
        });
      }
    } catch {}
    setEditingId(null);
    setEditContent("");
  };

  const changeMemory = (value: number) => {
    setMemory(value);
    localStorage.setItem("chat-memory", value.toString());
  };

  if (status === "loading")
    return <div className="min-h-screen bg-black flex items-center justify-center"><span className="text-white animate-pulse">Загрузка...</span></div>;

  return (
    <main className="min-h-screen bg-black text-white flex">
      {/* Боковая панель диалогов (скрывается на мобильных, но пока оставим видимой) */}
      <aside className="w-64 border-r border-gray-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Диалоги</h2>
          <button onClick={createNewConversation} className="text-blue-400 hover:text-blue-300 text-2xl leading-none" title="Новый диалог">+</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                activeConvId === conv.id ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-900"
              }`}
            >
              <div className="truncate">{conv.title}</div>
              <div className="text-xs text-gray-500">{new Date(conv.updatedAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
        <SignOutButton />
      </aside>

      {/* Основная область чата */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/20">🐰</div>
            <div>
              <h1 className="text-lg font-semibold">AI-советник</h1>
              <p className="text-xs text-gray-400">Всегда рядом, чтобы помочь</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {memoryLevels.map((level) => (
              <button key={level.value} onClick={() => changeMemory(level.value)}
                className={`px-3 py-1 rounded-lg text-xs transition ${memory === level.value ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}
                title={level.desc}>{level.label}</button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10 space-y-2">
              <div className="text-4xl">🐰💬</div>
              <p>Задай вопрос или выбери быстрое действие</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed relative group ${
                msg.role === "user" ? "bg-blue-600 text-white rounded-br-md" : "bg-gray-900 text-gray-100 rounded-bl-md"
              }`}>
                {editingId === msg.id ? (
                  <div className="flex flex-col gap-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-gray-800 text-white p-1 rounded text-sm"
                      rows={3}
                      aria-label="Редактировать сообщение"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={saveEdit} className="text-xs bg-green-600 px-2 py-1 rounded">Сохранить</button>
                      <button onClick={() => setEditingId(null)} className="text-xs bg-gray-600 px-2 py-1 rounded">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content}
                    {msg.role === "user" && (
                      <button
                        onClick={() => startEdit(msg)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-xs text-gray-300 hover:text-white transition"
                        title="Редактировать"
                      >✎</button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 text-gray-400 p-3 rounded-2xl rounded-bl-md text-sm animate-pulse">Печатает...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {messages.length === 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button key={action} onClick={() => sendMessage(action)} disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800 hover:text-white transition">
                {action}
              </button>
            ))}
          </div>
        )}

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
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition px-5 py-2 rounded-xl font-medium flex items-center gap-2">
              <span>➤</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}