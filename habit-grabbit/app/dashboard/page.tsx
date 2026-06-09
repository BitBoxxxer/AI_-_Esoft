// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <div>Вы не авторизованы. Пожалуйста, войдите.</div>;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">
        Привет, {session.user?.name || session.user?.email}!
      </h1>
      <p className="text-gray-600 mt-2">
        Твой ID в системе: {session.user?.id}
      </p>
      <p className="text-green-600 mt-4">Авторизация работает 🎉</p>
    </main>
  );
}