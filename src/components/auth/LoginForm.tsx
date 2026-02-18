"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { loginSchema, LoginInput } from "@/lib/validations/auth.schema";
import { signIn } from "@/lib/auth-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setGlobalError(null);
    const result = await signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: "/dashboard",
    });

    if (result.error) {
      setGlobalError("Email ou mot de passe incorrect.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {globalError && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {globalError}
        </p>
      )}
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Input label="Mot de passe" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-gray-600">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-peach-600 hover:underline">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  );
}
