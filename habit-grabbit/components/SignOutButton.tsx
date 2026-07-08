"use client";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function SignOutButton() {
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSignOut = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    await refresh();
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
    >
      Выйти
    </button>
  );
}
