import { signIn } from "@/../auth";
import { redirect } from "next/navigation";
import { auth } from "@/../auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;

  if (session?.user?.employeeId) {
    redirect(callbackUrl ?? "/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sales Tracker</h1>
        <p className="text-sm text-gray-500 mb-8">Caveo Sales · Q1 2026–27</p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error === "AccessDenied"
              ? "Your Microsoft account is not linked to an employee record. Contact your manager."
              : "Sign-in failed. Please try again."}
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", {
              redirectTo: callbackUrl ?? "/",
            });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-[#0078d4] hover:bg-[#006cbf] text-white font-medium py-3 px-4 rounded-lg transition"
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6">
          Use your <strong>@caveoinfosystems.com</strong> Microsoft account
        </p>
      </div>
    </div>
  );
}
