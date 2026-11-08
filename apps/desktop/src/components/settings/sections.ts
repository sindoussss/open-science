import type { ComponentType } from "react";
import {
  IconSettingsOutlineRegular,
  type IconProps,
} from "@/components/icons/dsh";

/** Settings sections — simplified for ScienceAI. */
export const SETTINGS_SECTIONS = [
  { key: "general", icon: IconSettingsOutlineRegular },
] as const satisfies ReadonlyArray<{ key: string; icon: ComponentType<IconProps>; desktopOnly?: boolean }>;

export type SettingsSection =
  | "general"
  | "appearance"
  | "agents"
  | "memory"
  | "network"
  | "connectors"
  | "browser"
  | "computer"
  | "compute"
  | "remote"
  | "privacy";

/** Sections to show in ScienceAI. */
export function visibleSections(_isWeb: boolean) {
  return SETTINGS_SECTIONS;
}

export function isDesktopOnlySection(_key: SettingsSection): boolean {
  return false;
}

export function resolveSection(_raw: string | undefined): SettingsSection {
  return "general";
}
