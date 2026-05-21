import { ShieldCheck, UserRound, Users } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { assertResearchManager } from "../actions";
import { AssistantsTable, type AssistantRow } from "./AssistantsTable";

export const dynamic = "force-dynamic";

const manageableRoles = [
  Role.ADMIN,
  Role.CHIEF_ASSISTANT,
  Role.ASSISTANT,
  Role.RESEARCHER,
  Role.LECTURER,
  Role.STUDENT,
];

export default async function AssistantsPage() {
  await assertResearchManager();

  const users = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  const rows: AssistantRow[] = users.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    roles: user.roles,
  }));

  const adminUsers = users.filter((user) => user.roles.includes(Role.ADMIN)).length;
  const assistants = users.filter(
    (user) => user.roles.includes(Role.ASSISTANT) || user.roles.includes(Role.CHIEF_ASSISTANT),
  ).length;

  const stats = [
    { label: "Users", value: users.length, icon: Users, color: "text-blue-600" },
    { label: "Admins", value: adminUsers, icon: ShieldCheck, color: "text-emerald-600" },
    { label: "Assistants", value: assistants, icon: UserRound, color: "text-purple-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap">
        {stats.map((item) => (
          <div key={item.label} className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="text-base font-black text-slate-950">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <AssistantsTable rows={rows} roleOptions={manageableRoles} />
    </div>
  );
}
