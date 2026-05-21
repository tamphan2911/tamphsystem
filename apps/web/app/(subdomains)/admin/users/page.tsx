import { Role, prisma } from "@repo/db";
import { createUser, updateUserRoles } from "../actions";

export const dynamic = "force-dynamic";

const roleOptions = Object.values(Role);

export default async function UsersManagementPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Users & Roles</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Create accounts and assign access across admin, Learn, and Research domains.
        </p>
      </div>

      <form action={createUser} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <h2 className="mb-4 font-bold">Create user</h2>
        <div className="grid gap-3 lg:grid-cols-4">
          <input name="name" placeholder="Name" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          <input name="email" type="email" required placeholder="Email" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          <input name="password" type="password" placeholder="Password (default: password)" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-400">Create</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {roleOptions.map((role) => (
            <label key={role} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <input type="checkbox" name="roles" value={role} defaultChecked={role === Role.STUDENT} />
              {role}
            </label>
          ))}
        </div>
      </form>

      <div className="space-y-4">
        {users.map((user) => (
          <form key={user.id} action={updateUserRoles} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <input type="hidden" name="userId" value={user.id} />
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h2 className="font-bold">{user.name || "Unnamed user"}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
                <p className="mt-1 text-xs text-slate-400">Joined {user.createdAt.toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                  <label key={role} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                    <input type="checkbox" name="roles" value={role} defaultChecked={user.roles.includes(role)} />
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
