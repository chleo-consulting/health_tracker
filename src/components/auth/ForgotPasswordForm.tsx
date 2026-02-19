"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validations/auth.schema";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: "/reset-password",
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-4 text-sm text-green-800">
        Si un compte existe pour cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Envoi…" : "Envoyer le lien de réinitialisation"}
      </Button>
      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="text-peach-600 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
