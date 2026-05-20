export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-slate-400 text-lg">
          Welcome to the control center. Here you can manage configurations, users, and content across all subdomains.
        </p>
      </div>
    </div>
  );
}
