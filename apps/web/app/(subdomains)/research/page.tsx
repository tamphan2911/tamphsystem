import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardList,
  Rocket,
  Satellite,
  Sparkles,
  Telescope,
} from "lucide-react";

const floatingItems = [
  {
    label: "Papers",
    icon: BookOpenCheck,
    className: "left-[8%] top-[16%] rotate-[-10deg]",
    color:
      "border-cyan-300/30 bg-cyan-300/10 text-cyan-100 shadow-cyan-950/30",
  },
  {
    label: "Tasks",
    icon: ClipboardList,
    className: "right-[12%] top-[18%] rotate-[8deg]",
    color:
      "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 shadow-emerald-950/30",
  },
  {
    label: "Signals",
    icon: Satellite,
    className: "left-[14%] bottom-[20%] rotate-[7deg]",
    color:
      "border-blue-300/30 bg-blue-300/10 text-blue-100 shadow-blue-950/30",
  },
  {
    label: "Venues",
    icon: Telescope,
    className: "right-[10%] bottom-[17%] rotate-[-8deg]",
    color:
      "border-amber-300/30 bg-amber-300/10 text-amber-100 shadow-amber-950/30",
  },
];

const starPositions = [
  "left-[6%] top-[34%]",
  "left-[22%] top-[11%]",
  "left-[31%] bottom-[14%]",
  "right-[27%] top-[10%]",
  "right-[33%] bottom-[18%]",
  "right-[6%] top-[46%]",
];

export default function ResearchWelcomePage() {
  return (
    <section className="-m-4 min-h-[calc(100vh-5rem)] overflow-hidden bg-slate-950 text-white sm:-m-8">
      <div className="relative min-h-[calc(100vh-5rem)] px-5 py-12 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div className="absolute left-[15%] top-[28%] h-px w-40 rotate-12 bg-cyan-300/40" />
          <div className="absolute right-[18%] top-[36%] h-px w-52 -rotate-12 bg-emerald-300/30" />
          <div className="absolute bottom-[23%] left-[39%] h-px w-48 rotate-6 bg-amber-300/25" />
        </div>

        {starPositions.map((position) => (
          <Sparkles
            key={position}
            className={`pointer-events-none absolute h-5 w-5 animate-[hubFloat_5.8s_ease-in-out_infinite] text-white/35 ${position}`}
          />
        ))}

        {floatingItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`pointer-events-none absolute hidden animate-[hubFloat_6s_ease-in-out_infinite] items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-wide shadow-2xl backdrop-blur md:inline-flex ${item.className} ${item.color}`}
              style={{ animationDuration: `${5.5 + index * 0.45}s` }}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </div>
          );
        })}

        <div className="relative mx-auto flex min-h-[calc(100vh-11rem)] max-w-7xl items-center">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-300/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-blue-100 shadow-lg shadow-blue-950/20">
                <Rocket className="h-4 w-4" />
                Airlock cleared
              </div>

              <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.05] tracking-normal text-white sm:text-6xl lg:text-7xl">
                Welcome to Tam&apos;s Research Hub, boss.
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
                You made it into the research spacecraft. Good collab only from
                here: clean papers, sharp tasks, smart venues, and zero messy
                manuscript drama.
              </p>

              <p className="mt-4 max-w-3xl text-base leading-7 text-cyan-100">
                Congrats. The crew is checked in, the journals are watching, and
                the pipeline is ready to move like it has somewhere important to
                be.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/projects"
                  className="group inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-cyan-200/60 bg-cyan-100 px-6 text-sm font-black text-slate-950 shadow-2xl shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-cyan-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30"
                >
                  Roll into the research galaxy
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <span className="text-sm font-semibold text-slate-400">
                  Papers do not fly themselves. Let&apos;s hustle.
                </span>
              </div>
            </div>

            <div className="relative mx-auto h-80 w-full max-w-sm lg:h-[28rem]">
              <div className="absolute inset-x-10 top-2 h-px rotate-[-14deg] bg-cyan-300/40" />
              <div className="absolute bottom-12 left-6 h-px w-52 rotate-[18deg] bg-emerald-300/35" />
              <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 animate-[hubFloat_6s_ease-in-out_infinite] rounded-[2.5rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <Image
                  src="/research-logo.png"
                  alt="Research astronaut"
                  width={224}
                  height={224}
                  priority
                  className="h-full w-full rounded-[2rem] object-cover"
                />
              </div>
              <div className="absolute right-1 top-16 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 shadow-xl shadow-amber-950/20 backdrop-blur">
                Status: floating
              </div>
              <div className="absolute bottom-8 left-1 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-100 shadow-xl shadow-emerald-950/20 backdrop-blur">
                Collab mode: locked in
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
