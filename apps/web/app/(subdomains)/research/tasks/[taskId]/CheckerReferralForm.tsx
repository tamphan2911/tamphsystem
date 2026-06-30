"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { LifeBuoy, Loader2 } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

type CheckerReferralOption = {
  value: "assigner" | "admin";
  label: string;
  detail: string;
};

export function CheckerReferralForm({
  action,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  options: CheckerReferralOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  const selectedCount = selectedTargets.length;
  const selectedText = useMemo(() => {
    if (selectedCount === 0) return "";
    if (selectedCount === 1) {
      return options.find((option) => option.value === selectedTargets[0])
        ?.label;
    }
    return "selected helpers";
  }, [options, selectedCount, selectedTargets]);

  function closeDialog(force = false) {
    if (isPending && !force) return;
    setIsOpen(false);
    setSelectedTargets([]);
  }

  if (options.length === 0) return null;

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-none bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-md"
        >
          <LifeBuoy className="h-4 w-4" />
          Refer for help
        </button>
      </div>

      <ResearchModal
        open={isOpen}
        onClose={() => closeDialog()}
        title="Refer checker action?"
        description="Choose who should help with this current checker action. The referral applies only to this action and will not carry into future checker steps."
        icon={<LifeBuoy className="h-5 w-5" />}
        maxWidth="max-w-lg"
        headerActions={
          <ResearchButton
            type="button"
            disabled={isPending || selectedCount === 0}
            tone="primary"
            onClick={() => {
              startTransition(() => {
                formRef.current?.requestSubmit();
              });
            }}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LifeBuoy className="h-4 w-4" />
            )}
            Confirm referral
          </ResearchButton>
        }
      >
        <form
          ref={formRef}
          action={async (formData) => {
            if (selectedCount === 0) {
              toast.showError({
                title: "Choose a helper",
                detail:
                  "Select the assigner, admin, or both before confirming the referral.",
              });
              return;
            }
            await action(formData);
            closeDialog(true);
            toast.showSuccess({
              title: "Checker help requested",
              detail: selectedText
                ? `This checker action was referred to ${selectedText}.`
                : "The selected helper was notified.",
            });
            router.refresh();
          }}
          className="grid gap-3"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 border border-[#D8D0C2] bg-[#F8F6EF] px-3 py-3 text-sm leading-5 text-slate-700 transition hover:border-[#1F7180]/40 hover:bg-[#F5F2EC] dark:border-[#444444] dark:bg-[#242424] dark:text-[#E4E4E4] dark:hover:border-[#A8DADC]/45 dark:hover:bg-[#303030]"
            >
              <input
                type="checkbox"
                name="targets"
                value={option.value}
                checked={selectedTargets.includes(option.value)}
                onChange={(event) => {
                  setSelectedTargets((current) =>
                    event.target.checked
                      ? [...current, option.value]
                      : current.filter((value) => value !== option.value),
                  );
                }}
                className="mt-0.5 h-4 w-4 flex-none accent-[#1F7180] dark:accent-[#A8DADC]"
              />
              <span className="min-w-0">
                <span className="block font-semibold text-slate-800 dark:text-[#E4E4E4]">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-[#B0B0B0]">
                  {option.detail}
                </span>
              </span>
            </label>
          ))}
        </form>
      </ResearchModal>
    </>
  );
}
