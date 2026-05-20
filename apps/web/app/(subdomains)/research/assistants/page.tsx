import { ShieldCheck } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { assertResearchManager, updateResearchRoles } from "../actions";

export const dynamic = "force-dynamic";

const manageableRoles = [
  Role.ADMIN,
  Role.CHIEF_ASSISTANT,
  Role.ASSISTANT,
  Role.RESEARCHER,
  Role.LECTURER,
  Role.STUDENT,
];

function roleDescription(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "Full control, including assigning jurisdiction.";
    case Role.CHIEF_ASSISTANT:
      return "Can coordinate submissions, journals, accounts, and assistant work.";
    case Role.ASSISTANT:
      return "Can help with submissions and assigned research tasks.";
    case Role.RESEARCHER:
      return "Can participate in research records.";
    case Role.LECTURER:
      return "Academic role shared with LMS.";
    case Role.STUDENT:
      return "Default limited account.";
    default:
      return "";
  }
}

export default async function AssistantsPage() {
  await assertResearchManager();

  const users = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          <ShieldCheck className="h-8 w-8 text-emerald-500" />
          Assistants & Jurisdiction
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Admin decides who can help manage research, submissions, journals, accounts, and claim records.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {manageableRoles.map((role) => (
          <div key={role} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="font-bold">{role}</p>
            <p className="mt-1 text-sm text-slate-500">{roleDescription(role)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <form key={user.id} action={updateResearchRoles} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <input type="hidden" name="userId" value={user.id} />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">{user.name || "Unnamed user"}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {manageableRoles.map((role) => (
                  <label key={role} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                    <input
                      type="checkbox"
                      name="roles"
                      value={role}
                      defaultChecked={user.roles.includes(role)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {role}
                  </label>
                ))}
              </div>
              <button className="w-fit rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                Save Roles
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
