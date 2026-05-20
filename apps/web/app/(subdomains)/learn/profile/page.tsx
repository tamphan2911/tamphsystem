import { auth } from "../../../../auth";
import { prisma } from "@repo/db";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function ProfileServerPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, roles: true }
  });

  if (!user) {
    redirect("/login");
  }

  return <ProfileClient user={user} />;
}
