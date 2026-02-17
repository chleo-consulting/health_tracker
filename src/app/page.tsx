import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Weight Tracker</h1>
        <p className="mt-3 text-lg text-gray-600">
          Suivez l&apos;évolution de votre poids simplement et efficacement.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Se connecter
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          S&apos;inscrire
        </Link>
      </div>
    </main>
  );
}
