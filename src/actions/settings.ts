"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireSession } from "@/lib/auth/session";
import { updateSetting, getSettingsByCategory } from "@/lib/settings/service";
import { z } from "zod";

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export type SettingsActionState = {
  success?: boolean;
  error?: string;
};

export async function getSettingsAction(category?: string) {
  await requireSession();
  if (category) {
    return getSettingsByCategory(category);
  }
  const categories = ["paths", "services", "general", "ports"];
  const result: Record<string, Awaited<ReturnType<typeof getSettingsByCategory>>> = {};
  for (const cat of categories) {
    result[cat] = await getSettingsByCategory(cat);
  }
  return result;
}

export async function updateSettingAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  try {
    await requireSuperAdmin();

    const parsed = updateSettingSchema.safeParse({
      key: formData.get("key"),
      value: formData.get("value"),
    });

    if (!parsed.success) {
      return { error: "Invalid input" };
    }

    await updateSetting(parsed.data.key, parsed.data.value);
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update setting",
    };
  }
}

export async function updateSettingsBatchAction(
  settings: { key: string; value: string }[]
): Promise<SettingsActionState> {
  try {
    await requireSuperAdmin();

    for (const { key, value } of settings) {
      await updateSetting(key, value);
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update settings",
    };
  }
}
