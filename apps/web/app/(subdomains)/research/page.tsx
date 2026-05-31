import Link from "next/link";
import {
  ArrowRight,
  Atom,
  BookOpenCheck,
  BrainCircuit,
  ClipboardList,
  FileSearch,
  Orbit,
  Radar,
  Rocket,
  Satellite,
  Sparkles,
  Telescope,
} from "lucide-react";

const floatingIcons = [
  {
    icon: BookOpenCheck,
    className: "left-[9%] top-[18%] rotate-[-12deg]",
    color: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    animation: "galaxyDriftA",
    duration: "9.2s",
  },
  {
    icon: ClipboardList,
    className: "right-[13%] top-[17%] rotate-[10deg]",
    color: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    animation: "galaxyDriftB",
    duration: "10.4s",
  },
  {
    icon: Satellite,
    className: "left-[13%] bottom-[19%] rotate-[8deg]",
    color: "border-blue-300/30 bg-blue-300/10 text-blue-100",
    animation: "galaxyDriftC",
    duration: "11.1s",
  },
  {
    icon: Telescope,
    className: "right-[11%] bottom-[20%] rotate-[-9deg]",
    color: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    animation: "galaxyDriftA",
    duration: "9.8s",
  },
  {
    icon: Rocket,
    className: "left-[28%] top-[12%] rotate-[14deg]",
    color: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
    animation: "galaxyDriftB",
    duration: "12.2s",
  },
  {
    icon: Orbit,
    className: "right-[30%] bottom-[11%] rotate-[-16deg]",
    color: "border-indigo-300/30 bg-indigo-300/10 text-indigo-100",
    animation: "galaxyDriftC",
    duration: "10.7s",
  },
  {
    icon: Atom,
    className: "left-[42%] top-[8%] rotate-[9deg]",
    color: "border-violet-300/25 bg-violet-300/10 text-violet-100",
    animation: "galaxyDriftC",
    duration: "13s",
  },
  {
    icon: BrainCircuit,
    className: "right-[42%] top-[24%] rotate-[-6deg]",
    color: "border-teal-300/25 bg-teal-300/10 text-teal-100",
    animation: "galaxyDriftA",
    duration: "11.6s",
  },
  {
    icon: FileSearch,
    className: "left-[38%] bottom-[8%] rotate-[18deg]",
    color: "border-sky-300/25 bg-sky-300/10 text-sky-100",
    animation: "galaxyDriftB",
    duration: "12.8s",
  },
  {
    icon: Radar,
    className: "right-[5%] top-[48%] rotate-[12deg]",
    color: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    animation: "galaxyDriftC",
    duration: "10.9s",
  },
];

const starPositions = [
  "left-[6%] top-[38%]",
  "left-[20%] top-[9%]",
  "left-[31%] bottom-[15%]",
  "left-[46%] top-[18%]",
  "left-[58%] bottom-[34%]",
  "right-[26%] top-[10%]",
  "right-[34%] bottom-[24%]",
  "right-[7%] top-[47%]",
  "right-[19%] bottom-[9%]",
  "right-[48%] top-[39%]",
];

export default function ResearchWelcomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#01030b] px-5 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(34,211,238,0.19),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(168,85,247,0.18),transparent_24%),radial-gradient(circle_at_50%_84%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(135deg,#01030b_0%,#05051f_48%,#01030b_100%)]" />
        <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle,rgba(255,255,255,0.78)_1px,transparent_1.5px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(125,211,252,0.7)_1px,transparent_2px)] bg-[size:92px_92px]" />
        <div className="absolute inset-x-[10%] top-[17%] h-px rotate-[-11deg] bg-cyan-200/22" />
        <div className="absolute inset-x-[16%] bottom-[22%] h-px rotate-[8deg] bg-violet-200/18" />
        <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/8" />
        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-200/8" />
      </div>

      {starPositions.map((position) => (
        <Sparkles
          key={position}
          className={`pointer-events-none absolute h-4 w-4 animate-[hubFloat_5.8s_ease-in-out_infinite] text-white/40 ${position}`}
        />
      ))}

      {floatingIcons.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.className}
            className={`pointer-events-none absolute flex h-14 w-14 items-center justify-center rounded-2xl border shadow-2xl shadow-black/40 backdrop-blur ${item.className} ${item.color}`}
            style={{
              animation: `${item.animation} ${item.duration} ease-in-out infinite`,
            }}
          >
            <Icon className="h-6 w-6" />
          </div>
        );
      })}

      <section className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wide text-cyan-100 shadow-lg shadow-cyan-950/20 backdrop-blur">
          <Rocket className="h-4 w-4" />
          Welcome aboard
        </div>

        <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.05] tracking-normal text-white sm:text-6xl lg:text-7xl">
          Tam&apos;s Research Hub
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
          You made it in, boss. Good papers, sharp collab, clean moves. Let&apos;s
          make the research galaxy behave.
        </p>

        <Link
          href="/projects"
          className="group mt-9 inline-flex h-12 items-center justify-center gap-3 rounded-full border border-cyan-200/45 bg-white/10 px-6 text-sm font-black text-cyan-50 shadow-2xl shadow-cyan-950/30 ring-1 ring-white/10 backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-100/70 hover:bg-cyan-100 hover:text-slate-950 hover:shadow-cyan-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30"
        >
          Blast into the research zone
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
      </section>
    </main>
  );
}
