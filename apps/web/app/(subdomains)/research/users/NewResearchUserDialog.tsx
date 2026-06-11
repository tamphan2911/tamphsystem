"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save, UserPlus } from "lucide-react";
import { createResearchSiteUser } from "../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
  researchLabelClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

function reasonMessage(reason?: string) {
  if (reason === "MISSING_REQUIRED") return "Name and password are required.";
  if (reason === "PASSWORD_SHORT")
    return "Password must have at least 6 characters.";
  if (reason === "CREATE_FAILED")
    return "The user could not be created. Check if the email already exists.";
  return "Please check the user information and try again.";
}

export function NewResearchUserDialog({
  roleOptions,
}: {
  roleOptions: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showSuccess, showError } = useResearchToast();

  function closeDialog() {
    setOpen(false);
  }

  function submitUser(formData: FormData) {
    startTransition(async () => {
      const result = await createResearchSiteUser(formData);
      if (result?.ok) {
        closeDialog();
        showSuccess({
          title: "User created",
          detail: `${result.email || "The user"} was added to Research Hub with email verification pending.`,
        });
        router.refresh();
        return;
      }
      showError({
        title: "Could not create user",
        detail: reasonMessage(result?.reason),
      });
    });
  }

  return (
    <>
      <ResearchButton
        type="button"
        onClick={() => setOpen(true)}
        className="research-new-button"
      >
        <PlusCircle className="h-4 w-4" />
        New User
      </ResearchButton>

      <ResearchModal
        open={open}
        onClose={closeDialog}
        title="Add Research User"
        icon={<UserPlus className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton form="new-research-user-form" disabled={isPending}>
            <Save className="h-4 w-4" />
            Create User
          </ResearchButton>
        }
      >
        <form
          id="new-research-user-form"
          action={submitUser}
          className="grid gap-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={researchLabelClass}>
              Name
              <input
                name="name"
                required
                placeholder="Full name"
                className={researchFieldClass}
              />
            </label>
            <label className={researchLabelClass}>
              Email (optional)
              <input
                name="email"
                type="email"
                placeholder="user@example.com, or leave blank"
                className={researchFieldClass}
              />
            </label>
            <label className={researchLabelClass}>
              Affiliation
              <input
                name="affiliation"
                placeholder="University, lab, or organization"
                className={researchFieldClass}
              />
            </label>
            <label className={researchLabelClass}>
              Temporary password
              <input
                name="password"
                type="text"
                required
                minLength={6}
                placeholder="At least 6 characters"
                className={researchFieldClass}
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              Roles
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roleOptions.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-center gap-2 border border-[#444444] px-3 py-2 text-sm font-normal text-[#E4E4E4] transition hover:border-[#5A5A5A] hover:bg-[#383838]"
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={role}
                    defaultChecked={role === "USER"}
                    className="accent-[#A8DADC]"
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>

          <div className="border border-[#444444] bg-[#242424] px-4 py-3 text-sm leading-6 text-[#B0B0B0]">
            Admin-created users can access Research Hub after verifying their
            email. Their first successful login will send the verification link.
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
