import type { Metadata } from "next";
import Image from "next/image";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Inscription — Weight Tracker" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src="/icon.svg" alt="Weight Tracker" width={64} height={64} />
          <span className="text-2xl font-bold text-gray-900">Weight Tracker</span>
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">Créer un compte</h1>
        <RegisterForm />
      </div>
    </main>
  );
}
