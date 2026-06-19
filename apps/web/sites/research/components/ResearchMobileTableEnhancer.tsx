"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const iconLabels: Array<[string, string]> = [
  ["key-round", "Account"],
  ["lock-keyhole", "Password"],
  ["at-sign", "Email"],
  ["send", "Submissions"],
  ["badge-check", "Accepted / published"],
  ["clipboard-check", "Reviews"],
  ["sticky-note", "Note"],
  ["calendar", "Date"],
  ["download", "Download"],
  ["pencil", "Edit"],
  ["trash", "Delete"],
  ["external-link", "Link"],
];

function normalizedText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function headerLabel(header: HTMLTableCellElement, index: number, count: number) {
  const explicit = normalizedText(header.dataset.mobileLabel);
  if (explicit) return explicit;

  const text = normalizedText(header.textContent);
  if (text) return text;

  const labelled = header.querySelector<HTMLElement>("[aria-label]");
  const ariaLabel = normalizedText(labelled?.getAttribute("aria-label"));
  if (ariaLabel) return ariaLabel;

  const iconClass = normalizedText(
    header.querySelector<SVGElement>("svg")?.getAttribute("class"),
  ).toLowerCase();
  const iconLabel = iconLabels.find(([key]) => iconClass.includes(key))?.[1];
  if (iconLabel) return iconLabel;

  if (index === count - 1) return "Actions";
  return index === 0 ? "Record" : "Details";
}

function enhanceTable(table: HTMLTableElement) {
  if (table.dataset.mobileTable === "scroll") return;

  const headers = Array.from(table.tHead?.rows[0]?.cells ?? []);
  if (headers.length === 0) return;
  const labels = headers.map((header, index) =>
    headerLabel(header, index, headers.length),
  );

  table.classList.add("research-mobile-card-table");
  Array.from(table.tBodies).forEach((body) => {
    Array.from(body.rows).forEach((row) => {
      row.classList.add("research-mobile-card-row");
      Array.from(row.cells).forEach((cell, index) => {
        if (cell.colSpan > 1) {
          cell.classList.add("research-mobile-card-empty");
          cell.removeAttribute("data-mobile-label");
          return;
        }
        cell.classList.remove("research-mobile-card-empty");
        cell.dataset.mobileLabel = labels[index] ?? `Detail ${index + 1}`;
      });
    });
  });
}

export function ResearchMobileTableEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".research-site-root main");
    if (!root) return;
    const tableRoot = root;

    let frame = 0;
    function enhanceAllTables() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        tableRoot
          .querySelectorAll<HTMLTableElement>("table")
          .forEach(enhanceTable);
      });
    }

    enhanceAllTables();
    const observer = new MutationObserver(enhanceAllTables);
    observer.observe(tableRoot, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
