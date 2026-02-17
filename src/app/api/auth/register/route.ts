import { NextRequest, NextResponse } from "next/server";
import { APIError } from "better-auth";
import { auth } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth.schema";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0].message,
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.email.split("@")[0],
      },
    });

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          created_at: result.user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === "UNPROCESSABLE_ENTITY") {
        return NextResponse.json(
          { error: { code: "EMAIL_ALREADY_EXISTS", message: "Email déjà utilisé" } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: error.message } },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erreur serveur interne" } },
      { status: 500 }
    );
  }
}
