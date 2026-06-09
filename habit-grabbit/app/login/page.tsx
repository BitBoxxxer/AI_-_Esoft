"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Habit GRabbit</h1>
        <p className="text-gray-600 mb-6">Войди через GitHub, чтобы начать</p>
        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
        >
          Войти через GitHub
        </button>
      </div>
    </div>
  );
}