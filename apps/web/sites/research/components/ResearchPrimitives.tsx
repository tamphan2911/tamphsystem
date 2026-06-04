"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate" | "cyan";
type ButtonTone = "primary" | "secondary" | "danger" | "success" | "quiet";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const researchFieldClass =
  "h-12 w-full rounded-none border border-[#D1D5DB] bg-[#2C2C2C] px-3 text-sm font-normal text-[#E4E4E4] outline-none transition duration-150 ease-out placeholder:text-[#B0B0B0] hover:border-[#E5E7EB] hover:bg-[#383838] focus:border-[#E5E7EB] focus:bg-[#383838] focus:ring-2 focus:ring-[#E5E7EB]/20 disabled:cursor-not-allowed disabled:border-[#6B7280] disabled:bg-[#383838] disabled:text-[#B0B0B0]";

export const researchTextareaClass =
  "min-h-28 w-full rounded-none border border-[#D1D5DB] bg-[#2C2C2C] px-3 py-2.5 text-sm font-normal text-[#E4E4E4] outline-none transition duration-150 ease-out placeholder:text-[#B0B0B0] hover:border-[#E5E7EB] hover:bg-[#383838] focus:border-[#E5E7EB] focus:bg-[#383838] focus:ring-2 focus:ring-[#E5E7EB]/20 disabled:cursor-not-allowed disabled:border-[#6B7280] disabled:bg-[#383838] disabled:text-[#B0B0B0]";

export const researchLabelClass =
  "grid gap-1.5 text-sm font-normal text-[#E4E4E4]";

export const researchSectionClass =
  "rounded-none border border-[#444444] bg-[#2C2C2C] p-5";

export const researchItemClass =
  "rounded-none border border-[#444444] bg-[#2C2C2C]";

const buttonClasses: Record<ButtonTone, string> = {
  primary:
    "border-[#B39CD0] bg-[#B39CD0] text-[#2C2C2C] hover:border-[#C8B6E2] hover:bg-[#C8B6E2] hover:text-[#2C2C2C] focus:ring-[#B39CD0]/30",
  secondary:
    "border-[#444444] bg-[#2C2C2C] text-[#E4E4E4] hover:border-[#A8DADC] hover:bg-[#383838] hover:text-white focus:ring-[#A8DADC]/20",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 shadow-rose-900/5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 focus:ring-rose-500/15 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:border-rose-700 dark:hover:bg-rose-900/50 dark:hover:text-rose-100 dark:focus:ring-rose-500/20",
  success:
    "border-emerald-200 bg-emerald-100/80 text-emerald-800 shadow-emerald-900/5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-emerald-900/10 focus:ring-emerald-500/15 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/55 dark:hover:text-emerald-100 dark:focus:ring-emerald-500/20",
  quiet:
    "border-transparent bg-transparent text-[#B0B0B0] shadow-transparent hover:border-[#444444] hover:bg-[#383838] hover:text-[#E4E4E4] focus:ring-[#A8DADC]/20",
};

export function ResearchButton({
  tone = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: "sm" | "md";
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border text-sm font-normal shadow-sm outline-none transition duration-150 ease-out hover:shadow-md focus:ring-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm motion-reduce:transition-none",
        size === "sm" ? "h-9 px-3" : "h-10 px-4",
        buttonClasses[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

const iconToneClasses: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50",
  emerald:
    "border-emerald-100 bg-emerald-50 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50",
  amber:
    "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50",
  rose: "border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-200 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50",
  violet:
    "border-violet-100 bg-violet-50 text-violet-600 hover:border-violet-200 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50",
  slate:
    "border-[#444444] bg-[#2C2C2C] text-[#B0B0B0] hover:border-[#A8DADC] hover:bg-[#383838] hover:text-[#E4E4E4]",
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-700 hover:border-cyan-200 hover:bg-cyan-100 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/50",
};

export function ResearchIconButton({
  label,
  tone = "slate",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <IconHint label={label}>
      <button
        {...props}
        aria-label={props["aria-label"] ?? label}
        className={cx(
          "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-none border shadow-sm outline-none transition duration-150 ease-out hover:shadow-md focus:ring-2 focus:ring-[#A8DADC]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm motion-reduce:transition-none",
          iconToneClasses[tone],
          className,
        )}
      >
        {children}
      </button>
    </IconHint>
  );
}

export function IconHint({
  label,
  position = "top",
  children,
}: {
  label: string;
  position?: "top" | "bottom";
  children: ReactNode;
}) {
  return (
    <span className="group/icon relative inline-flex">
      {children}
      <span
        className={cx(
          "pointer-events-none absolute left-1/2 z-[9999] -translate-x-1/2 whitespace-nowrap rounded-none border border-[#444444] bg-[#2C2C2C] px-2.5 py-1.5 text-[11px] font-normal text-[#E4E4E4] opacity-0 shadow-lg shadow-black/30 transition duration-200 ease-out group-hover/icon:translate-y-0 group-hover/icon:opacity-100",
          position === "top"
            ? "bottom-full mb-2 translate-y-1"
            : "top-full mt-2 -translate-y-1",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function ResearchStatusIcon({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: Tone;
}) {
  return (
    <IconHint label={label}>
      <span
        className={cx(
          "inline-flex h-8 w-8 items-center justify-center rounded-none border shadow-sm transition duration-200 ease-out hover:shadow-md motion-reduce:transition-none",
          iconToneClasses[tone],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}
