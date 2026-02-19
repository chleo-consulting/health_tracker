"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validations/auth.schema";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      router.replace("/login?error=invalid_token");
    }
  }, [token, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    const result = await authClient.resetPassword({
      newPassword: data.newPassword,
      token: token!,
    });

    if (result.error) {
      router.replace("/login?error=invalid_token");
    } else {
      router.replace("/login?reset=success");
    }
  };

  if (!token) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <Input
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
