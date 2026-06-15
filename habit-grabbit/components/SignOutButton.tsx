"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
    >
      Выйти
    </button>
  );
}