import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const researchSectionClass =
  "rounded-lg border border-[#ded8cf] bg-[#fbfaf7] p-5 shadow-sm shadow-[#201c25]/[0.04] dark:border-[#332c3d] dark:bg-[#111019] dark:shadow-black/20";

export function ResearchDetailSection({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx(researchSectionClass, className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="text-base font-black text-slate-950 dark:text-white">
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
