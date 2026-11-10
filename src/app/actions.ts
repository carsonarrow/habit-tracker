"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCore } from "@/core";
import type { Day } from "@/core/day";

export async function addHabit(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  if (!name.trim()) return;
  getCore().addHabit(name);
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function toggleCheckIn(habitId: number, day: Day) {
  getCore().toggleCheckIn(habitId, day);
  revalidatePath("/");
}

export async function renameHabit(habitId: number, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  if (!name.trim()) return;
  getCore().renameHabit(habitId, name);
  revalidatePath("/");
  revalidatePath("/habits");
  redirect("/habits");
}

export async function setStartDay(habitId: number, formData: FormData) {
  try {
    getCore().setStartDay(habitId, String(formData.get("startDay") ?? ""));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not set Start Day";
    redirect(`/habits/${habitId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/");
  revalidatePath("/habits");
  redirect("/habits");
}

export async function archiveHabit(habitId: number) {
  getCore().archiveHabit(habitId);
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/archived");
  redirect("/habits");
}

export async function restoreHabit(habitId: number) {
  getCore().restoreHabit(habitId);
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/archived");
}

export async function deleteHabit(habitId: number) {
  getCore().deleteHabit(habitId);
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/archived");
}
