import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Mot de passe oublié — Weight Tracker" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Saisissez votre email pour recevoir un lien de réinitialisation.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
