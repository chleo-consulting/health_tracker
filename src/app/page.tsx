import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 bg-peach-50">
      <div className="text-center">
        <div className="flex items-center justify-center gap-4">
          <Image
            src="/logo.jpg"
            alt="Weight Tracker"
            width={220}
            height={80}
            style={{ height: "auto" }}
            priority
          />
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Weight Tracker</h1>
        </div>
        <p className="mt-3 text-lg text-gray-600">
          Suivez l&apos;évolution de votre poids simplement et efficacement.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-gradient-to-r from-peach-400 to-peach-600 px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-peach-200 hover:from-peach-500 hover:to-peach-700 transition-all"
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
