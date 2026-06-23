"use client";

import { useMemo, useState } from "react";
import {
  BookOpenText,
  ClipboardCheck,
  FileSearch,
  Lightbulb,
  Route,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSearchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";

export type TaskGuideOption = {
  id: string;
  guideCode: string;
  title: string;
  content: string;
};

const defaultGuideIconStyle: {
  icon: LucideIcon;
  className: string;
} = {
  icon: BookOpenText,
  className: "text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC]",
};

const guideIconStyles: Array<{
  icon: LucideIcon;
  className: string;
}> = [
  defaultGuideIconStyle,
  {
    icon: ClipboardCheck,
    className: "text-[#2F8F62] hover:text-[#226A49] dark:text-[#9ED6B5]",
  },
  {
    icon: FileSearch,
    className: "text-[#6F5AA8] hover:text-[#57458A] dark:text-[#C8B6E2]",
  },
  {
    icon: Route,
    className: "text-[#A06716] hover:text-[#7A4D10] dark:text-[#F4D47A]",
  },
  {
    icon: Lightbulb,
    className: "text-[#B33E5C] hover:text-[#8E2F48] dark:text-[#F0A6B5]",
  },
];

function guideIconMeta(index: number) {
  return (
    guideIconStyles[index % guideIconStyles.length] ?? defaultGuideIconStyle
  );
}

function GuideContentModal({
  guide,
  onClose,
}: {
  guide: TaskGuideOption | null;
  onClose: () => void;
}) {
  const meta = guide ? guideIconMeta(0) : guideIconMeta(0);
  const Icon = meta.icon;
  return (
    <ResearchModal
      open={Boolean(guide)}
      onClose={onClose}
      title={guide?.title ?? "Task guide"}
      description={guide?.guideCode}
      icon={<Icon className="h-5 w-5" />}
      maxWidth="max-w-3xl"
    >
      <div className="max-h-[65vh] overflow-y-auto whitespace-pre-wrap border border-[#d8d0c3] bg-[#f7f4ed] p-4 text-sm leading-6 text-[#1F2937] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
        {guide?.content}
      </div>
    </ResearchModal>
  );
}

export function TaskGuideIcons({ guides }: { guides: TaskGuideOption[] }) {
  const [openGuide, setOpenGuide] = useState<TaskGuideOption | null>(null);
  if (guides.length === 0) return null;

  return (
    <>
      <span className="inline-flex items-center gap-1">
        {guides.map((guide, index) => {
          const meta = guideIconMeta(index);
          const Icon = meta.icon;
          return (
            <IconHint key={guide.id} label={guide.title}>
              <button
                type="button"
                aria-label={`Open guide: ${guide.title}`}
                onClick={() => setOpenGuide(guide)}
                className={`research-clickable-icon research-allow-transform inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent shadow-none outline-none transition-[color,transform,filter] duration-200 ease-out hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:scale-95 ${meta.className}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            </IconHint>
          );
        })}
      </span>
      <GuideContentModal guide={openGuide} onClose={() => setOpenGuide(null)} />
    </>
  );
}

export function TaskGuidePicker({
  guides,
  selectedIds,
  onChange,
}: {
  guides: TaskGuideOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedGuides = useMemo(
    () =>
      selectedIds.flatMap(
        (id) => guides.find((guide) => guide.id === id) ?? [],
      ),
    [guides, selectedIds],
  );
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return guides
      .filter((guide) => !selectedIds.includes(guide.id))
      .filter((guide) =>
        [guide.guideCode, guide.title, guide.content]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 12);
  }, [guides, query, selectedIds]);

  function addGuide(id: string) {
    onChange([...selectedIds, id]);
    setQuery("");
  }

  function removeGuide(id: string) {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  }

  return (
    <section className="grid gap-2">
      {selectedGuides.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedGuides.map((guide) => (
            <span
              key={guide.id}
              className="inline-flex max-w-full items-center gap-2 border border-[#d8d0c3] bg-[#f7f4ed] px-3 py-2 text-xs text-[#1F2937] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4]"
            >
              <BookOpenText className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
              <span className="min-w-0 truncate">
                {guide.guideCode} - {guide.title}
              </span>
              <button
                type="button"
                aria-label={`Remove ${guide.title}`}
                onClick={() => removeGuide(guide.id)}
                className="research-clickable-icon research-allow-transform flex-none border-0 bg-transparent p-0 text-[#667085] hover:text-rose-600 dark:text-[#B0B0B0] dark:hover:text-rose-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <div
          className={`${researchSearchFieldClass} flex items-center gap-3 px-3`}
        >
          <BookOpenText className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search and choose task guides"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-slate-400 dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A]"
          />
        </div>
        {results.length > 0 ? (
          <div
            className={`${researchDropdownPanelClass} absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[80] max-h-[13.5rem] overflow-y-auto`}
          >
            {results.map((guide) => (
              <button
                key={guide.id}
                type="button"
                onClick={() => addGuide(guide.id)}
                className={`${researchDropdownItemClass} ${researchDropdownItemIdleClass} px-3`}
              >
                <BookOpenText className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{guide.title}</span>
                  <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                    {guide.guideCode}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : query.trim() ? (
          <div
            className={`${researchDropdownPanelClass} absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[80] px-3 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]`}
          >
            No guide matches this search.
          </div>
        ) : null}
      </div>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="taskGuideIds" value={id} />
      ))}
    </section>
  );
}
