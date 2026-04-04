import { prisma } from "../libs/prisma";
import {
  DEFAULT_LEARNING_SCAN_SETTINGS,
  LEARNING_SCAN_CONFIG_KEY,
  parseLearningScanSettingsValue,
  type LearningScanSettings,
} from "~/lib/learning-scan-settings";

export async function getLearningScanSettings(): Promise<LearningScanSettings> {
  const row = await prisma.configuration.findUnique({
    where: { key: LEARNING_SCAN_CONFIG_KEY },
  });
  if (!row) {
    return { ...DEFAULT_LEARNING_SCAN_SETTINGS };
  }
  return parseLearningScanSettingsValue(row.value);
}

export async function upsertLearningScanSettings(
  settings: LearningScanSettings,
  updatedBy: string | null,
): Promise<void> {
  await prisma.configuration.upsert({
    where: { key: LEARNING_SCAN_CONFIG_KEY },
    create: {
      key: LEARNING_SCAN_CONFIG_KEY,
      value: settings,
      updatedBy: updatedBy ?? undefined,
    },
    update: {
      value: settings,
      updatedBy: updatedBy ?? undefined,
    },
  });
}
