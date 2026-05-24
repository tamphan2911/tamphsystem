"use client";

import { useRef, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { useResearchToast } from "./ResearchToast";

export function SaveForm({
  action,
  className,
  id,
  successMessage = "Research details saved",
  successDetail = "Research information, registration, claim status, and production checklist are now saved.",
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  className?: string;
  id?: string;
  successMessage?: string;
  successDetail?: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const { showSuccess } = useResearchToast();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await action(formData);
      showSuccess({
        title: successMessage,
        detail: successDetail,
      });
    });
  }

  return (
    <form
      ref={formRef}
      id={id}
      onSubmit={handleSubmit}
      className={className}
      data-saving={isPending ? "true" : "false"}
    >
      {children}
    </form>
  );
}
