"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";

const guideSupportFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
]);
const guideSupportFileTypesByExtension = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
]);
const g006SupportFileTypes = new Map([
  ...guideSupportFileTypes,
  ["application/vnd.rar", ".rar"],
  ["application/x-rar-compressed", ".rar"],
]);
const g006SupportFileTypesByExtension = new Map([
  ...guideSupportFileTypesByExtension,
  ["rar", "application/vnd.rar"],
]);
const guideSupportMaxFileSize = 2 * 1024 * 1024;

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
  const importantNote =
    String(formData.get("importantNote") ?? "").trim() || null;
  if (!title) throw new Error("Enter a guide title.");
  if (!content) throw new Error("Enter the guide content.");
  return { title, content, importantNote };
}

async function guideSupportFileValues(
  formData: FormData,
  options: {
    allowRar?: boolean;
    unlimitedSize?: boolean;
    fieldName?: string;
    outputPrefix?: "" | "supportFile2";
  } = {},
) {
  const file = formData.get(options.fieldName ?? "supportFile");
  if (!(file instanceof File) || file.size === 0) return undefined;

  const extension = file.name.toLowerCase().split(".").pop();
  const allowedTypes = options.allowRar
    ? g006SupportFileTypes
    : guideSupportFileTypes;
  const allowedExtensions = options.allowRar
    ? g006SupportFileTypesByExtension
    : guideSupportFileTypesByExtension;
  const allowedByMime = allowedTypes.has(file.type);
  const allowedByExtension =
    Boolean(extension) && allowedExtensions.has(extension ?? "");

  if (!allowedByMime && !allowedByExtension) {
    throw new Error(
      options.allowRar
        ? "Upload only .doc, .docx, .pdf, or .rar support files."
        : "Upload only .doc, .docx, or .pdf support files.",
    );
  }
  if (!options.unlimitedSize && file.size > guideSupportMaxFileSize) {
    throw new Error("Support file must be 2 MB or smaller.");
  }

  if (options.outputPrefix === "supportFile2") {
    return {
      supportFile2Name: file.name,
      supportFile2Type:
        file.type || allowedExtensions.get(extension ?? "") || "",
      supportFile2Size: file.size,
      supportFile2Data: Buffer.from(await file.arrayBuffer()),
    };
  }

  return {
    supportFileName: file.name,
    supportFileType: file.type || allowedExtensions.get(extension ?? "") || "",
    supportFileSize: file.size,
    supportFileData: Buffer.from(await file.arrayBuffer()),
  };
}

async function nextGuideCode() {
  const guides = await prisma.taskGuide.findMany({
    select: { guideCode: true },
  });
  const highestNumber = guides.reduce((highest, guide) => {
    const match = /^G(\d+)$/.exec(guide.guideCode);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `G${String(highestNumber + 1).padStart(3, "0")}`;
}

export async function createTaskGuide(formData: FormData) {
  const userId = await requireAdmin();
  const values = guideValues(formData);
  const supportFile = await guideSupportFileValues(formData);
  let created = false;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    try {
      await prisma.taskGuide.create({
        data: {
          ...values,
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
  revalidatePath("/task-guides");
}

export async function updateTaskGuide(id: string, formData: FormData) {
  await requireAdmin();
  const values = guideValues(formData);
  const currentGuide = await prisma.taskGuide.findUnique({
    where: { id },
    select: { guideCode: true },
  });
  const isG014 = currentGuide?.guideCode === "G014";
  const supportFile = await guideSupportFileValues(formData, {
    allowRar: currentGuide?.guideCode === "G006",
    unlimitedSize: currentGuide?.guideCode === "G006",
  });
  const supportFile2 = isG014
    ? await guideSupportFileValues(formData, {
        fieldName: "supportFile2",
        outputPrefix: "supportFile2",
      })
    : undefined;
  await prisma.taskGuide.update({
    where: { id },
    data: { ...values, ...supportFile, ...supportFile2 },
  });
  revalidatePath("/task-guides");
  revalidatePath("/tasks");
}

export async function deleteTaskGuide(id: string) {
  await requireAdmin();
  await prisma.taskGuide.delete({ where: { id } });
  revalidatePath("/task-guides");
  revalidatePath("/tasks");
}
