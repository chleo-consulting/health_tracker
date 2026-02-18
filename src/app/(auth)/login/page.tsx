import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Connexion — Weight Tracker" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src="/icon.svg" alt="Weight Tracker" width={64} height={64} />
          <span className="text-2xl font-bold text-gray-900">Weight Tracker</span>
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">Connexion</h1>
        <LoginForm />
      </div>
    </main>
  );
}
