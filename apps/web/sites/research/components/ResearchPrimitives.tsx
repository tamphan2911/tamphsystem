"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate" | "cyan";
type ButtonTone = "primary" | "secondary" | "danger" | "success" | "quiet";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const researchFieldClass =
  "h-12 w-full rounded-lg border border-[#d8d1c8] bg-[#f1eee8] px-3 text-sm font-normal text-[#201c25] outline-none transition duration-200 ease-out placeholder:text-[#9a9185] hover:border-[#c9bfb4] hover:bg-white focus:border-[#ff8a3d] focus:bg-white focus:ring-4 focus:ring-[#ff8a3d]/15 disabled:cursor-not-allowed disabled:bg-[#e8e2d8] disabled:text-[#9a9185] dark:border-[#403849] dark:bg-[#14101d] dark:text-[#f4f0ff] dark:placeholder:text-[#766f80] dark:hover:border-[#5b5268] dark:hover:bg-[#1b1724] dark:focus:border-[#ff8a3d] dark:focus:bg-[#17131d] dark:disabled:bg-[#17131d] dark:disabled:text-[#766f80]";

export const researchTextareaClass =
  "min-h-28 w-full rounded-lg border border-[#d8d1c8] bg-[#f1eee8] px-3 py-2.5 text-sm font-normal text-[#201c25] outline-none transition duration-200 ease-out placeholder:text-[#9a9185] hover:border-[#c9bfb4] hover:bg-white focus:border-[#ff8a3d] focus:bg-white focus:ring-4 focus:ring-[#ff8a3d]/15 disabled:cursor-not-allowed disabled:bg-[#e8e2d8] disabled:text-[#9a9185] dark:border-[#403849] dark:bg-[#14101d] dark:text-[#f4f0ff] dark:placeholder:text-[#766f80] dark:hover:border-[#5b5268] dark:hover:bg-[#1b1724] dark:focus:border-[#ff8a3d] dark:focus:bg-[#17131d] dark:disabled:bg-[#17131d] dark:disabled:text-[#766f80]";

export const researchLabelClass =
  "grid gap-1.5 text-sm font-semibold text-[#423b49] dark:text-[#d7d1df]";

export const researchSectionClass =
  "rounded-lg border border-[#ded8cf] bg-[#fbfaf7] p-5 shadow-sm shadow-[#201c25]/[0.04] dark:border-[#332c3d] dark:bg-[#111019] dark:shadow-black/20";

export const researchItemClass =
  "rounded-lg border border-[#ded8cf] bg-[#fbfaf7] shadow-sm shadow-[#201c25]/[0.03] dark:border-[#332c3d] dark:bg-[#14101d]";

const buttonClasses: Record<ButtonTone, string> = {
  primary:
    "border-[#ffceb5] bg-[#fff1e9] text-[#9f3f16] shadow-[#9f3f16]/5 hover:border-[#ffb38a] hover:bg-white hover:text-[#7d2f0f] hover:shadow-[#9f3f16]/10 focus:ring-[#ff8a3d]/25 dark:border-[#ff8a3d]/40 dark:bg-[#2a1812] dark:text-[#ffb38a] dark:hover:border-[#ffb38a]/70 dark:hover:bg-[#3a2119] dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-[#ff8a3d]/25",
  secondary:
    "border-[#d8d1c8] bg-white text-[#423b49] shadow-[#201c25]/[0.03] hover:border-[#c9bfb4] hover:bg-[#f7f3ed] hover:text-[#17131d] focus:ring-[#6d6378]/10 dark:border-[#403849] dark:bg-[#17131d] dark:text-[#d7d1df] dark:shadow-black/10 dark:hover:border-[#5b5268] dark:hover:bg-[#211c2d] dark:hover:text-white dark:focus:ring-[#766f80]/20",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 shadow-rose-900/5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 focus:ring-rose-500/15 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:border-rose-700 dark:hover:bg-rose-900/50 dark:hover:text-rose-100 dark:focus:ring-rose-500/20",
  success:
    "border-emerald-200 bg-emerald-100/80 text-emerald-800 shadow-emerald-900/5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-emerald-900/10 focus:ring-emerald-500/15 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/55 dark:hover:text-emerald-100 dark:focus:ring-emerald-500/20",
  quiet:
    "border-transparent bg-transparent text-[#655d6d] shadow-transparent hover:border-[#ded8cf] hover:bg-[#f1eee8] hover:text-[#201c25] focus:ring-[#6d6378]/10 dark:text-[#aaa4b5] dark:hover:border-[#403849] dark:hover:bg-[#211c2d] dark:hover:text-white dark:focus:ring-[#766f80]/20",
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
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-bold shadow-sm outline-none transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus:ring-4 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0",
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
    "border-[#d8d1c8] bg-white text-[#655d6d] hover:border-[#c9bfb4] hover:bg-[#f7f3ed] hover:text-[#201c25] dark:border-[#403849] dark:bg-[#17131d] dark:text-[#d7d1df] dark:hover:bg-[#211c2d] dark:hover:text-white",
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
          "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border shadow-sm outline-none transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus:ring-4 focus:ring-[#ff8a3d]/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0",
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
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#ded8cf] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#423b49] opacity-0 shadow-lg shadow-[#201c25]/10 transition duration-200 ease-out group-hover/icon:translate-y-0 group-hover/icon:opacity-100 dark:border-[#403849] dark:bg-[#14101d] dark:text-[#d7d1df] dark:shadow-black/30",
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
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          iconToneClasses[tone],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}
