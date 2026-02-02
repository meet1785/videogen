import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Authentication Disabled</h1>
        <p className="text-zinc-400 mb-6">
          Auth is currently disabled for development. You can access the dashboard directly.
        </p>
        <Link 
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
