import { signIn } from "../../../auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl dark:shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>

        <form
          action={async (formData) => {
            "use server";
            // NextAuth v5 automatically handles redirecting and errors
            await signIn("credentials", formData, { redirectTo: "/" });
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              defaultValue="admin@tamph.com"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              defaultValue="password"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
