"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

type Tone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate" | "cyan";
type ButtonTone = "primary" | "secondary" | "danger" | "success" | "quiet";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const researchFieldClass =
  "h-12 w-full rounded-none border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:focus:border-[#A8DADC] dark:focus:bg-[#383838] dark:disabled:border-[#3A3A3A] dark:disabled:bg-[#383838] dark:disabled:text-[#B0B0B0]";

export const researchSearchFieldClass =
  "research-search-field h-12 w-full rounded-none border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:focus:border-[#A8DADC] dark:focus:bg-[#383838] dark:disabled:border-[#3A3A3A] dark:disabled:bg-[#383838] dark:disabled:text-[#B0B0B0]";

export const researchSelectTriggerClass =
  "research-select-trigger h-12 w-full rounded-none border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition duration-150 ease-out hover:border-slate-300 hover:bg-slate-50 focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:focus:border-[#5A5A5A] dark:focus:bg-[#383838] dark:disabled:border-[#3A3A3A] dark:disabled:bg-[#383838] dark:disabled:text-[#B0B0B0]";

export const researchDropdownPanelClass =
  "research-dropdown-panel overflow-hidden rounded-none border border-slate-200 bg-white text-slate-800 shadow-2xl shadow-slate-900/12 dark:border-[#5A5A5A] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:shadow-black/35";

export const researchDropdownItemClass =
  "flex w-full items-start justify-between gap-3 rounded-none border-y px-0 py-2.5 text-left text-sm leading-5 transition duration-150 ease-out motion-reduce:transition-none";

export const researchDropdownItemIdleClass =
  "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-[#B0B0B0] dark:hover:border-[#444444] dark:hover:bg-[#303030] dark:hover:text-white";

export const researchDropdownItemActiveClass =
  "border-sky-100 bg-sky-50 font-normal text-slate-950 dark:border-[#444444] dark:bg-[#383838] dark:text-[#E4E4E4]";

export const researchTextareaClass =
  "min-h-28 w-full rounded-none border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:focus:border-[#A8DADC] dark:focus:bg-[#383838] dark:disabled:border-[#3A3A3A] dark:disabled:bg-[#383838] dark:disabled:text-[#B0B0B0]";

export const researchLinkClass =
  "font-normal text-[#E4E4E4] transition-[color,text-shadow,filter,transform] duration-180 ease-out hover:text-[#A8DADC] hover:[text-shadow:0_0_0.65rem_rgba(168,218,220,0.22)] active:[transform:scale(0.985)] active:brightness-110 motion-reduce:transform-none motion-reduce:transition-none";

export const researchMutedLinkClass =
  "font-normal text-[#B0B0B0] transition-[color,text-shadow,filter,transform] duration-180 ease-out hover:text-[#A8DADC] hover:[text-shadow:0_0_0.65rem_rgba(168,218,220,0.2)] active:[transform:scale(0.985)] active:brightness-110 motion-reduce:transform-none motion-reduce:transition-none";

export const researchLabelClass =
  "grid gap-1.5 text-sm font-normal text-slate-800 dark:text-[#E4E4E4]";

export const researchSectionClass =
  "rounded-none border border-slate-200 bg-white p-5 dark:border-[#444444] dark:bg-[#2C2C2C]";

export const researchItemClass =
  "rounded-none border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#2C2C2C]";

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
    "border-transparent bg-transparent text-slate-500 shadow-transparent hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800 focus:ring-sky-500/20 dark:text-[#B0B0B0] dark:hover:border-[#444444] dark:hover:bg-[#383838] dark:hover:text-[#E4E4E4] dark:focus:ring-[#A8DADC]/20",
};

export function ResearchButton({
  tone = "primary",
  size = "md",
  className,
  children,
  onClick,
  disabled,
  type,
  form,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: "sm" | "md";
}) {
  const [isClickLoading, setIsClickLoading] = useState(false);
  const isSubmitButton =
    type !== "button" && (type === "submit" || Boolean(form));
  const isDisabled = Boolean(disabled || isClickLoading);

  useEffect(() => {
    if (!disabled) setIsClickLoading(false);
  }, [disabled]);

  return (
    <button
      {...props}
      type={type}
      form={form}
      disabled={isDisabled}
      aria-busy={isClickLoading || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !isSubmitButton || disabled) return;

        const relatedForm = form
          ? document.getElementById(form)
          : event.currentTarget.form;
        if (
          relatedForm instanceof HTMLFormElement &&
          !relatedForm.checkValidity()
        ) {
          return;
        }

        setIsClickLoading(true);
      }}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border text-sm font-normal shadow-sm outline-none transition duration-150 ease-out hover:shadow-md focus:ring-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm motion-reduce:transition-none",
        size === "sm" ? "h-9 px-3" : "h-10 px-4",
        buttonClasses[tone],
        className,
      )}
    >
      {isClickLoading ? (
        <span
          className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}

const iconToneClasses: Record<Tone, string> = {
  blue: "border-transparent bg-transparent text-blue-700 hover:border-transparent hover:bg-transparent hover:text-blue-800 dark:border-transparent dark:bg-transparent dark:text-blue-300 dark:hover:bg-transparent",
  emerald:
    "border-transparent bg-transparent text-emerald-700 hover:border-transparent hover:bg-transparent hover:text-emerald-800 dark:border-transparent dark:bg-transparent dark:text-emerald-300 dark:hover:bg-transparent",
  amber:
    "border-transparent bg-transparent text-amber-700 hover:border-transparent hover:bg-transparent hover:text-amber-800 dark:border-transparent dark:bg-transparent dark:text-amber-300 dark:hover:bg-transparent",
  rose: "border-transparent bg-transparent text-rose-700 hover:border-transparent hover:bg-transparent hover:text-rose-800 dark:border-transparent dark:bg-transparent dark:text-rose-300 dark:hover:bg-transparent",
  violet:
    "border-transparent bg-transparent text-violet-700 hover:border-transparent hover:bg-transparent hover:text-violet-800 dark:border-transparent dark:bg-transparent dark:text-violet-300 dark:hover:bg-transparent",
  slate:
    "border-transparent bg-transparent text-slate-600 hover:border-transparent hover:bg-transparent hover:text-slate-900 dark:border-transparent dark:bg-transparent dark:text-[#B0B0B0] dark:hover:bg-transparent dark:hover:text-[#E4E4E4]",
  cyan: "border-transparent bg-transparent text-cyan-700 hover:border-transparent hover:bg-transparent hover:text-cyan-800 dark:border-transparent dark:bg-transparent dark:text-cyan-300 dark:hover:bg-transparent",
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
          "research-clickable-icon research-allow-transform inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-none border shadow-none outline-none transition duration-150 ease-out hover:shadow-none focus:ring-0 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none motion-reduce:transition-none",
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
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });

  function showHint() {
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setCoords({
        left: Math.round(rect.left + rect.width / 2),
        top: Math.round(position === "top" ? rect.top - 8 : rect.bottom + 8),
      });
    }
    setVisible(true);
  }

  useEffect(() => {
    if (!visible) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const tooltipWidth = tooltipRef.current?.offsetWidth ?? 0;
      const viewportPadding = 12;
      const rawLeft = rect.left + rect.width / 2;
      const minLeft = tooltipWidth / 2 + viewportPadding;
      const maxLeft = window.innerWidth - tooltipWidth / 2 - viewportPadding;
      setCoords({
        left: Math.round(
          Math.min(Math.max(rawLeft, minLeft), Math.max(minLeft, maxLeft)),
        ),
        top: Math.round(position === "top" ? rect.top - 8 : rect.bottom + 8),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [position, visible]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={showHint}
      onMouseLeave={() => setVisible(false)}
      onFocus={showHint}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              style={{ left: coords.left, top: coords.top }}
              className={cx(
                "research-icon-tooltip pointer-events-none fixed z-[9999] max-w-[calc(100vw-1.5rem)] whitespace-nowrap rounded-none border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-normal text-slate-700 opacity-100 shadow-lg shadow-slate-900/12 transition duration-150 ease-out dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:shadow-black/30",
                position === "top"
                  ? "-translate-x-1/2 -translate-y-full"
                  : "-translate-x-1/2",
              )}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
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
          "inline-flex h-8 w-8 items-center justify-center rounded-none border border-transparent bg-transparent shadow-none transition duration-200 ease-out hover:border-transparent hover:bg-transparent hover:shadow-none motion-reduce:transition-none",
          iconToneClasses[tone],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}
