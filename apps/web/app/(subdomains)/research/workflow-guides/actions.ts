"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";

const supportFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
]);
const supportFileTypesByExtension = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
]);
const supportMaxFileSize = 2 * 1024 * 1024;

async function requireAdmin() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  if (!user?.roles.includes(Role.ADMIN)) redirect("/401");
  return userId;
}

function guideValues(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const workflowText = String(formData.get("workflowText") ?? "").trim();
  if (!title) throw new Error("Enter a workflow guide title.");
  if (!content) throw new Error("Enter guide content.");
  return {
    title,
    content,
    workflow: workflowText
      ? workflowText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [titlePart = "", detailPart] = line.split("::");
            return {
              title: titlePart.trim(),
              detail: (detailPart ?? "").trim(),
            };
          })
      : undefined,
  };
}

async function supportFileValues(formData: FormData) {
  const file = formData.get("supportFile");
  if (!(file instanceof File) || file.size === 0) return undefined;

  const extension = file.name.toLowerCase().split(".").pop();
  const allowedByMime = supportFileTypes.has(file.type);
  const allowedByExtension =
    Boolean(extension) && supportFileTypesByExtension.has(extension ?? "");

  if (!allowedByMime && !allowedByExtension) {
    throw new Error("Upload only .doc, .docx, or .pdf support files.");
  }
  if (file.size > supportMaxFileSize) {
    throw new Error("Support file must be 2 MB or smaller.");
  }

  return {
    supportFileName: file.name,
    supportFileType:
      file.type || supportFileTypesByExtension.get(extension ?? "") || "",
    supportFileSize: file.size,
    supportFileData: Buffer.from(await file.arrayBuffer()),
  };
}

async function nextGuideCode() {
  const guides = await prisma.assistantWorkflowGuide.findMany({
    select: { guideCode: true },
  });
  const highestNumber = guides.reduce((highest, guide) => {
    const match = /^AWG(\d+)$/.exec(guide.guideCode);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `AWG${String(highestNumber + 1).padStart(3, "0")}`;
}

export async function createWorkflowGuide(formData: FormData) {
  const userId = await requireAdmin();
  const values = guideValues(formData);
  const supportFile = await supportFileValues(formData);
  let created = false;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    try {
      await prisma.assistantWorkflowGuide.create({
        data: {
          title: values.title,
          content: values.content,
          workflow: values.workflow ?? Prisma.JsonNull,
          ...supportFile,
          guideCode: await nextGuideCode(),
          createdById: userId,
        },
      });
      created = true;
    } catch (error) {
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!isCodeCollision || attempt === 2) throw error;
    }
  }
  revalidatePath("/workflow-guides");
}

export async function updateWorkflowGuide(id: string, formData: FormData) {
  await requireAdmin();
  const values = guideValues(formData);
  const supportFile = await supportFileValues(formData);
  await prisma.assistantWorkflowGuide.update({
    where: { id },
    data: {
      title: values.title,
      content: values.content,
      workflow: values.workflow ?? Prisma.JsonNull,
      ...supportFile,
    },
  });
  revalidatePath("/workflow-guides");
}

export async function deleteWorkflowGuide(id: string) {
  await requireAdmin();
  await prisma.assistantWorkflowGuide.delete({ where: { id } });
  revalidatePath("/workflow-guides");
}
