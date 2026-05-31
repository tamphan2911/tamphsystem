import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Construction, Rocket } from "lucide-react";

type HubConstructionPageProps = {
  title: string;
  eyebrow: string;
  message: string;
  punchline: string;
  accent: "blue" | "emerald";
  icon: LucideIcon;
};

const accentClasses = {
  blue: {
    glow: "text-blue-300",
    badge: "border-blue-400/40 bg-blue-400/10 text-blue-100 shadow-blue-500/20",
    button: "bg-blue-500 text-white hover:bg-blue-400",
    panel: "border-blue-400/20 bg-blue-500/10 text-blue-100 shadow-blue-950/30",
  },
  emerald: {
    glow: "text-emerald-300",
    badge:
      "border-emerald-400/40 bg-emerald-400/10 text-emerald-100 shadow-emerald-500/20",
    button: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
    panel:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 shadow-emerald-950/30",
  },
};

export function HubConstructionPage({
  title,
  eyebrow,
  message,
  punchline,
  accent,
  icon: Icon,
}: HubConstructionPageProps) {
  const colors = accentClasses[accent];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 text-white sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute left-[8%] top-[18%] h-px w-32 rotate-12 bg-slate-500/40" />
        <div className="absolute right-[10%] top-[30%] h-px w-40 -rotate-12 bg-slate-500/30" />
        <div className="absolute bottom-[18%] left-[34%] h-px w-44 rotate-6 bg-slate-500/30" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_24rem] lg:items-center">
        <section>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide shadow-lg ${colors.badge}`}
          >
            <Construction className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-normal sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            {message}
          </p>
          <p className={`mt-4 max-w-2xl text-sm font-bold ${colors.glow}`}>
            {punchline}
          </p>
          <Link
            href="/"
            className={`mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${colors.button}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Research Hub
          </Link>
        </section>

        <aside className="relative min-h-80">
          <div className="absolute left-8 top-4 h-20 w-20 animate-[hubFloat_5.6s_ease-in-out_infinite] rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-200 shadow-xl backdrop-blur">
            <Rocket className="h-full w-full" />
          </div>
          <div
            className={`absolute right-4 top-24 flex h-44 w-44 animate-[hubFloat_6.4s_ease-in-out_infinite] items-center justify-center rounded-[2rem] border p-8 shadow-2xl backdrop-blur ${colors.panel}`}
          >
            <Icon className="h-20 w-20" />
          </div>
          <div className="absolute bottom-8 left-2 max-w-64 animate-[hubFloat_7s_ease-in-out_infinite] rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-xl shadow-black/30 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Status
            </p>
            <p className="mt-2 text-sm font-bold text-white">
              Under construction. Hard hats on. Swagger intact.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
