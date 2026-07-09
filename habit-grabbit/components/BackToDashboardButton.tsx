"use client";
import Link from "next/link";

export default function BackToDashboardButton() {
  return (
    <Link
      href="/dashboard"
      className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition text-sm inline-flex items-center gap-1"
    >
      ← Dashboard
    </Link>
  );
}
