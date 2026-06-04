import Link from "next/link";
import type { ElementType } from "react";
import {
  BookOpen,
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  ChevronDown,
  Code2,
  Database,
  FileText,
  GraduationCap,
  LibraryBig,
  MessageSquareText,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { LearnWorkflowTabs } from "../../../components/LearnWorkflowTabs";
import { HeroSearchBox } from "../../../components/HeroSearchBox";

export const dynamic = "force-dynamic";

const productMenu = [
  {
    title: "Course overview",
    description: "Browse learning paths without signing in",
    icon: Boxes,
  },
  {
    title: "Catalog",
    description: "Search practical courses and inspect modules",
    icon: LibraryBig,
  },
  {
    title: "Practice sessions",
    description: "Lessons, coding exercises, and quizzes",
    icon: Workflow,
  },
  {
    title: "AI learning",
    description: "Guided academic and technical workflows",
    icon: Sparkles,
  },
];

const useCaseMenu = [
  { title: "Data analysis", icon: Database },
  { title: "Research writing", icon: FileText },
  { title: "Python practice", icon: Code2 },
  { title: "Academic AI", icon: Bot },
  { title: "Finance modeling", icon: Braces },
  { title: "Course previews", icon: Search },
  { title: "Progress tracking", icon: CheckCircle2 },
  { title: "Learner support", icon: ShieldCheck },
];

const docsMenu = [
  { title: "How Learn works", icon: BookOpen },
  { title: "Course guide", icon: GraduationCap },
  { title: "Release notes", icon: Zap },
  { title: "Support", icon: MessageSquareText },
];

const logoItems = [
  "Python",
  "R",
  "Excel",
  "Research",
  "Finance",
  "AI",
  "Writing",
  "Data",
  "Web",
  "Stats",
  "Methods",
  "Projects",
];

const featureCards = [
  {
    title: "Browse before login",
    description:
      "Guests can inspect courses, sessions, and modules before creating an account.",
    icon: Search,
  },
  {
    title: "Enroll when ready",
    description:
      "Login is requested only when a learner wants to enroll and save progress.",
    icon: GraduationCap,
  },
  {
    title: "Practice-rich paths",
    description:
      "Each course can combine reading, video, code, quizzes, and applied tasks.",
    icon: PlayCircle,
  },
  {
    title: "Track momentum",
    description:
      "Learners continue from their profile with course progress and next steps.",
    icon: CheckCircle2,
  },
];

function DropdownPanel({
  items,
  wide = false,
}: {
  items: { title: string; description?: string; icon: ElementType }[];
  wide?: boolean;
}) {
  return (
    <div
      className={`invisible absolute left-1/2 top-full z-50 mt-5 -translate-x-1/2 rounded-lg border border-[#3d3648] bg-[#14101d]/95 p-7 opacity-0 shadow-2xl shadow-black/50 backdrop-blur-xl transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 ${
        wide ? "w-[42rem]" : "w-[26rem]"
      }`}
    >
      <div className={wide ? "grid grid-cols-2 gap-7" : "space-y-8"}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              href="/courses"
              key={item.title}
              className="flex gap-5 rounded-lg p-2 text-left hover:bg-white/5"
            >
              <Icon className="mt-1 h-6 w-6 flex-none text-white" />
              <span>
                <span className="block text-2xl font-medium leading-7 text-white">
                  {item.title}
                </span>
                {item.description && (
                  <span className="mt-2 block text-xl leading-7 text-[#aaa4b5]">
                    {item.description}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function LogoRow({
  reverse = false,
  items,
}: {
  reverse?: boolean;
  items: string[];
}) {
  const row = [...items, ...items];

  return (
    <div className="overflow-hidden">
      <div
        className={`flex w-max gap-6 ${
          reverse ? "learn-logo-marquee-reverse" : "learn-logo-marquee"
        }`}
      >
        {row.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex h-24 w-24 items-center justify-center rounded-lg border border-[#403849] bg-[#211c2d] text-sm font-bold text-[#d7d1df] shadow-lg shadow-black/20"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function LearnLandingPage() {
  const session = await auth();
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      author: true,
      modules: { include: { sessions: true } },
    },
    take: 4,
    orderBy: { updatedAt: "desc" },
  });

  const totalSessions = courses.reduce(
    (sum, course) =>
      sum +
      course.modules.reduce(
        (moduleSum, module) => moduleSum + module.sessions.length,
        0,
      ),
    0,
  );

  return (
    <main className="min-h-screen bg-[#090611] font-[var(--font-geist-sans)] text-white">
      <header className="sticky top-0 z-50 px-4 pt-[14px] sm:px-6 lg:px-10">
        <nav className="mx-auto flex h-[56px] max-w-[95rem] items-center justify-between rounded-2xl border border-[#3a3345] bg-[#111019]/90 px-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#51495d] bg-[#1f1a2a] text-[#ff8a3d]">
              <Workflow className="h-4 w-4" />
            </span>
            <span className="text-2xl font-semibold tracking-tight">
              Tamph Learn
            </span>
          </Link>

          <div className="hidden items-center gap-9 text-xl text-[#c7c0cf] lg:flex">
            <div className="group relative py-4">
              <button className="flex items-center gap-2 hover:text-white">
                Product <ChevronDown className="h-5 w-5" />
              </button>
              <DropdownPanel items={productMenu} />
            </div>
            <div className="group relative py-4">
              <button className="flex items-center gap-2 hover:text-white">
                Use cases <ChevronDown className="h-5 w-5" />
              </button>
              <DropdownPanel items={useCaseMenu} wide />
            </div>
            <div className="group relative py-4">
              <button className="flex items-center gap-2 hover:text-white">
                Docs <ChevronDown className="h-5 w-5" />
              </button>
              <DropdownPanel items={docsMenu} />
            </div>
            <Link href="/courses" className="hover:text-white">
              Courses
            </Link>
            <Link href="/profile" className="hover:text-white">
              Profile
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/courses"
              className="hidden h-8 items-center gap-2 rounded-lg border border-[#575063] bg-[#312c3b] px-3 text-base font-medium text-white hover:bg-[#40394d] sm:inline-flex"
            >
              <Star className="h-4 w-4" />
              {totalSessions || courses.length || "New"}
            </Link>
            <Link
              href="/login"
              className="hidden text-lg font-medium text-[#d7d1df] hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href={session?.user ? "/profile" : "/login"}
              className="inline-flex h-8 items-center rounded-lg bg-gradient-to-r from-[#ff8a3d] to-[#ff3f2e] px-4 text-lg font-semibold text-white shadow-lg shadow-[#ff8a3d]/20 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative min-h-screen overflow-hidden px-4 pb-12 pt-16 sm:px-6 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_28%,rgba(86,65,255,0.22),transparent_26%),radial-gradient(circle_at_72%_78%,rgba(255,84,45,0.28),transparent_24%)]" />
        <div className="absolute right-0 top-0 h-full w-[56%] bg-[linear-gradient(115deg,transparent_0%,rgba(255,117,57,0.08)_38%,rgba(74,60,120,0.18)_100%)]" />

        <div className="relative mx-auto grid max-w-[87rem] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="pt-16 lg:pt-24">
            <h1 className="max-w-3xl text-6xl font-light leading-[0.98] tracking-tight text-[#bdb7c7] sm:text-7xl lg:text-8xl">
              Courses and practice paths
              <span className="block font-normal text-white">
                you can see and control
              </span>
            </h1>
            <p className="mt-12 max-w-2xl text-2xl leading-9 text-[#b9b3c2]">
              Build visually, go deep with practice, and connect every lesson to
              a clear learning path. Guests can browse; enrollment starts when
              you are ready to save progress.
            </p>
            <div className="mt-12 flex flex-wrap gap-5">
              <Link
                href="/courses"
                className="inline-flex h-16 items-center rounded-lg bg-gradient-to-r from-[#ff8a3d] to-[#ff3f2e] px-8 text-xl font-semibold text-white shadow-xl shadow-[#ff8a3d]/20 hover:-translate-y-0.5"
              >
                Browse courses
              </Link>
              <Link
                href={session?.user ? "/profile" : "/login"}
                className="inline-flex h-16 items-center rounded-lg bg-[#2f2b38] px-8 text-xl font-semibold text-[#ece8f3] hover:-translate-y-0.5 hover:bg-[#40394d]"
              >
                {session?.user ? "Open profile" : "Log in to enroll"}
              </Link>
            </div>
          </div>

          <div className="relative flex min-h-[42rem] items-center lg:min-h-[52rem]">
            <div className="absolute inset-0 rounded-[4rem] bg-[radial-gradient(circle_at_70%_20%,rgba(255,138,61,0.35),transparent_34%),radial-gradient(circle_at_28%_76%,rgba(86,65,255,0.24),transparent_30%)] blur-2xl" />
            <div className="relative w-full rounded-3xl border border-[#4d4659] bg-[#120d1b]/90 p-6 shadow-[0_0_120px_rgba(255,93,50,0.24)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm font-semibold uppercase text-[#ff8a3d]">
                    Find a course
                  </p>
                  <h2 className="mt-2 text-4xl font-light text-white">
                    Search the Learn catalog
                  </h2>
                </div>
                <div className="hidden h-14 w-14 items-center justify-center rounded-lg border border-[#4d4659] bg-[#211c2d] text-[#ff8a3d] sm:flex">
                  <Search className="h-7 w-7" />
                </div>
              </div>

              <div className="mt-8">
                <HeroSearchBox variant="dark" />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Python", icon: Code2 },
                  { label: "Research", icon: BookOpen },
                  { label: "Progress", icon: CheckCircle2 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={`/courses?q=${encodeURIComponent(item.label)}`}
                      className="flex items-center gap-3 rounded-lg border border-[#3d3648] bg-[#211c2d]/80 px-4 py-4 text-lg font-semibold text-[#d9d4df] hover:border-[#ff8a3d] hover:text-white"
                    >
                      <Icon className="h-5 w-5 text-[#ff8a3d]" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 rounded-lg border border-[#3d3648] bg-[#171320] p-5">
                <div className="flex items-center gap-3">
                  <Bot className="h-6 w-6 text-[#ff8a3d]" />
                  <span className="text-2xl font-semibold">AI study agent</span>
                </div>
                <p className="mt-3 text-lg leading-7 text-[#aca6b7]">
                  Search a topic, preview the course path, then enroll when you
                  are ready to save progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LearnWorkflowTabs />

      <section className="flex min-h-screen items-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Open catalog.",
                text: "Guests can browse all published courses before signing in.",
              },
              {
                title: "Progress saved.",
                text: "Enrollment turns the path into a personal workspace.",
              },
              {
                title: "Practice-first.",
                text: "Lessons, coding, quizzes, and applied tasks sit together.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-[#573a35] bg-[linear-gradient(135deg,#201827,#612b22)] p-6"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-[#0f2338] text-[#ff8a3d]">
                  <Workflow className="h-7 w-7" />
                </div>
                <p className="text-2xl leading-9 text-[#d9d4df]">
                  <strong className="font-semibold text-white">
                    {item.title}
                  </strong>{" "}
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="py-28 text-center">
            <h2 className="mx-auto max-w-4xl text-6xl font-light leading-tight text-[#beb8c8]">
              Plug learning into your goals &
              <span className="block text-white">every practical skill</span>
            </h2>
            <p className="mt-7 text-2xl text-[#aca6b7]">
              Use curated paths for common topics. Search for everything else.
            </p>
          </div>

          <div className="space-y-8">
            <LogoRow items={logoItems} />
            <LogoRow reverse items={[...logoItems].reverse()} />
          </div>

          <div className="mt-20 text-center">
            <Link
              href="/courses"
              className="inline-flex h-14 items-center rounded-lg bg-gradient-to-r from-[#4397ff] to-[#7147ff] px-7 text-xl font-semibold text-white shadow-xl shadow-blue-950/20"
            >
              Browse all courses
            </Link>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-5xl font-light leading-tight text-white">
              Build your path with the short feedback loops learners need.
            </h2>
            <p className="text-2xl leading-9 text-[#aca6b7]">
              Courses are structured as visible paths: preview, enroll, learn,
              practice, and continue from profile.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-lg border border-[#3d3648] bg-[#15111e] p-6"
                >
                  <Icon className="h-8 w-8 text-[#ff8a3d]" />
                  <h3 className="mt-8 text-2xl font-semibold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-lg leading-7 text-[#aca6b7]">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="flex min-h-screen items-center bg-[linear-gradient(180deg,#8d3d25_0%,#090611_18%)] px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto w-full rounded-3xl border border-[#573a35] bg-[linear-gradient(180deg,#612b22_0%,#160c18_100%)] p-8 shadow-2xl shadow-black/40 lg:p-12">
          <div className="grid gap-10 border-b border-white/15 pb-16 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3 text-2xl font-semibold">
                <Workflow className="h-8 w-8 text-[#ff7293]" />
                Tamph Learn
              </div>
              <p className="mt-8 text-2xl font-semibold">
                Learn without limits
              </p>
              <div className="mt-8 flex gap-4 text-[#cfc6d4]">
                {[UsersRound, Star, MessageSquareText, BookOpen].map(
                  (Icon, index) => (
                    <Icon key={index} className="h-7 w-7" />
                  ),
                )}
              </div>
            </div>

            {[
              ["Courses", "Catalog", "Practice paths", "Student profile"],
              [
                "Resources",
                "Research writing",
                "Data analysis",
                "AI workflows",
              ],
              ["Platform", "Admin", "Research Hub", "Portfolio"],
            ].map((column) => (
              <div key={column[0]}>
                <h3 className="text-2xl font-semibold text-white">
                  {column[0]}
                </h3>
                <div className="mt-6 space-y-4 text-xl text-[#b8afbd]">
                  {column.slice(1).map((item) => (
                    <Link key={item} href="/courses" className="block">
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-8 pt-12 md:grid-cols-5">
            {[
              ["Popular topics", "Python", "Finance", "Research", "Writing"],
              [
                "Combinations",
                "AI and data",
                "Excel and finance",
                "Code and stats",
              ],
              ["Categories", "Development", "Academic", "Data", "Business"],
              ["Templates", "Quick start", "Course preview", "Quiz practice"],
              ["Guides", "How to enroll", "Track progress", "Learn workflow"],
            ].map((column) => (
              <div key={column[0]}>
                <h3 className="text-xl font-semibold text-white">
                  {column[0]}
                </h3>
                <div className="mt-5 space-y-3 text-lg text-[#a89fab]">
                  {column.slice(1).map((item) => (
                    <Link key={item} href="/courses" className="block">
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
