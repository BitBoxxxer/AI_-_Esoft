/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const res = await apiFetch("/api/notifications?unread=true");
    if (res.ok) setNotifications(await res.json());
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await apiFetch("/api/notifications", { method: "PATCH" });
    setNotifications([]);
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full transition"
        aria-label={`Уведомления (${unreadCount})`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-white">Уведомления</h3>
            <button onClick={markAllRead} className="text-xs text-blue-400 hover:underline">
              Прочитать все
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-gray-400 text-sm">Нет новых уведомлений</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 border-b border-gray-800 text-sm text-white hover:bg-gray-800">
                  {n.message}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}