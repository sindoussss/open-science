import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { renderAt } from "@/test/render";
import { useUiStore } from "@/lib/store";
import { shippedLocales } from "@/i18n/config";
import i18n from "@/i18n";

afterEach(async () => {
  useUiStore.getState().setLocale("en");
  await i18n.changeLanguage("en");
});

describe("Settings language selector", () => {
  it("shows a Language select with one option per shipped locale", async () => {
    renderAt("/settings");
    const select = await screen.findByRole("combobox", { name: "Language" });
    expect(within(select).getAllByRole("option")).toHaveLength(shippedLocales().length);
  });

  it("updates the store locale on change", async () => {
    renderAt("/settings");
    const select = await screen.findByRole("combobox", { name: "Language" });
    await userEvent.selectOptions(select, "ja");
    expect(useUiStore.getState().locale).toBe("ja");
  });
});

describe("Settings page strings (ScienceAI)", () => {
  it("renders the ScienceAI settings and navigation", async () => {
    renderAt("/settings");
    expect(await screen.findByRole("heading", { level: 1, name: "ScienceAI Settings" })).toBeInTheDocument();
    expect(screen.getByText("local-scientific/qwen3.5-9b-scientific")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to app" })).toBeInTheDocument();
  });
});
