"use server";

import { revalidatePath } from "next/cache";
import { getCore } from "@/core";
import type { Day } from "@/core/day";

export async function addHabit(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  if (!name.trim()) return;
  getCore().addHabit(name);
  revalidatePath("/");
}

export async function toggleCheckIn(habitId: number, day: Day) {
  getCore().toggleCheckIn(habitId, day);
  revalidatePath("/");
}
