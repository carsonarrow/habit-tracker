"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCore } from "@/core";
import { isValidDay, type Day } from "@/core/day";

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

export async function renameHabit(habitId: number, day: Day, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  if (!name.trim()) return;
  getCore().renameHabit(habitId, name);
  revalidatePath("/");
  redirect(isValidDay(day) ? `/?day=${day}` : "/");
}

export async function setStartDay(habitId: number, day: Day, formData: FormData) {
  const back = isValidDay(day) ? day : "";
  try {
    getCore().setStartDay(habitId, String(formData.get("startDay") ?? ""));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not set Start Day";
    const dayParam = back ? `day=${back}&` : "";
    redirect(`/habits/${habitId}?${dayParam}error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/");
  redirect(back ? `/?day=${back}` : "/");
}

export async function archiveHabit(habitId: number, day: Day) {
  getCore().archiveHabit(habitId);
  revalidatePath("/");
  // The Habit is hidden from today on, so go back to the Day the user came from.
  redirect(isValidDay(day) ? `/?day=${day}` : "/");
}

export async function restoreHabit(habitId: number) {
  getCore().restoreHabit(habitId);
  revalidatePath("/");
  revalidatePath("/archived");
}
