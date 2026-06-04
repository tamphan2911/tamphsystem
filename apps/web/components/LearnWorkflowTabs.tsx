"use client";

import { useState } from "react";
import {
  Bot,
  Brain,
  Braces,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  GraduationCap,
  MessageSquareText,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

const tabs = [
  {
    label: "New learners can",
    title: "Find the right course",
    description: "Search, compare modules, and preview sessions before login.",
    icon: Search,
    nodes: [
      { title: "Course search", detail: "topic: data analysis", icon: Search },
      { title: "AI guide", detail: "match goals", icon: Bot },
      { title: "Path choice", detail: "beginner friendly", icon: Workflow },
      { title: "Preview", detail: "open curriculum", icon: FileText },
    ],
  },
  {
    label: "Students can",
    title: "Practice with feedback",
    description: "Move from lesson to exercise to quiz without losing context.",
    icon: GraduationCap,
    nodes: [
      { title: "Video lesson", detail: "watch", icon: PlayCircle },
      { title: "Code task", detail: "python notebook", icon: Code2 },
      { title: "Quiz check", detail: "instant review", icon: CheckCircle2 },
      { title: "Progress", detail: "save status", icon: Brain },
    ],
  },
  {
    label: "Researchers can",
    title: "Turn methods into workflows",
    description: "Learn repeatable academic and data workflows step by step.",
    icon: Braces,
    nodes: [
      {
        title: "Research prompt",
        detail: "method plan",
        icon: MessageSquareText,
      },
      { title: "Dataset", detail: "structured source", icon: Database },
      { title: "Analysis", detail: "guided exercise", icon: Sparkles },
      { title: "Submission", detail: "portfolio-ready", icon: ShieldCheck },
    ],
  },
];

export function LearnWorkflowTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const fallbackTab = tabs[0];
  if (!fallbackTab) {
    return null;
  }

  const active = tabs[activeIndex] ?? fallbackTab;
  const ActiveIcon = active.icon;
  const diagramNodes = active.nodes;

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[23rem_1fr] lg:px-8">
      <div className="relative border-l border-[#3a3346]">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeIndex;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative block w-full px-8 py-7 text-left transition ${
                isActive
                  ? "bg-gradient-to-r from-[#2b2534] to-transparent"
                  : "opacity-55 hover:opacity-100"
              }`}
            >
              {isActive && (
                <span className="absolute -left-px top-0 h-full w-1 rounded-full bg-gradient-to-b from-[#38bdf8] to-[#2563eb]" />
              )}
              <span className="flex items-center gap-3 text-2xl font-semibold leading-tight text-white">
                <Icon className="h-5 w-5 text-[#38bdf8]" />
                {tab.label}
              </span>
              <span className="mt-2 block text-xl leading-8 text-[#aca6b7]">
                {tab.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[34rem] overflow-hidden rounded-lg border border-[#3b3448] bg-[#100b19] shadow-2xl shadow-black/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(91,75,130,0.24),transparent_36%),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,28px_28px,28px_28px]" />
        <div className="absolute inset-x-10 top-1/2 h-px bg-[#827b91]" />
        <div className="absolute left-[24%] top-[52%] h-px w-[22%] rotate-[30deg] bg-[#827b91]" />
        <div className="absolute right-[20%] top-[47%] h-px w-[26%] -rotate-[28deg] bg-[#827b91]" />

        <div className="relative z-10 p-7">
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#4b4358] bg-[#211b2a] px-4 py-3 text-sm font-semibold text-[#d7d1df]">
            <ActiveIcon className="h-5 w-5 text-[#38bdf8]" />
            {active.description}
          </div>

          <div className="mt-20 grid grid-cols-2 gap-x-14 gap-y-16 lg:grid-cols-4">
            {diagramNodes.map((node, index) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.title}
                  className={`relative rounded-lg border border-[#5a5266] bg-[#272230]/95 p-5 text-center shadow-xl shadow-black/30 ${
                    index === 1 ? "lg:mt-20" : ""
                  } ${index === 2 ? "lg:mt-4" : ""}`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-[#736b80] bg-[#312b3b] text-[#38bdf8]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {node.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#aca6b7]">{node.detail}</p>
                  {index < diagramNodes.length - 1 && (
                    <span className="absolute -right-10 top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full bg-[#d8d2e4] lg:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
