import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const researchSectionClass =
  "border border-[#444444] bg-[#2C2C2C] p-4 shadow-none sm:p-5";

export function ResearchDetailSection({
  id,
  title,
  action,
  children,
  className = "",
}: {
  id?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cx(researchSectionClass, className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
