"use server";

import { prisma } from "@repo/db";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with default STUDENT role
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roles: ["STUDENT"],
      },
    });

  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }

  // Redirect to login page on success
  redirect("/login");
}
