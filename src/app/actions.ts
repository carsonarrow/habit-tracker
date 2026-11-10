"use server";

import { revalidatePath } from "next/cache";
import { getCore } from "@/core";

export async function addHabit(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  if (!name.trim()) return;
  getCore().addHabit(name);
  revalidatePath("/");
}
