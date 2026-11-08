import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SettingsPage } from "./SettingsPage";

async function renderSettings() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/settings/general"]}>
        <Routes>
          <Route path="/settings/:section" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

describe("SettingsPage Model display", () => {
  it("renders the active ScienceAI local scientific model", async () => {
    await renderSettings();
    expect(screen.getByText("ScienceAI Settings")).toBeInTheDocument();
    expect(screen.getByText("local-scientific/qwen3.5-9b-scientific")).toBeInTheDocument();
    expect(screen.getByText("http://127.0.0.1:8000/v1")).toBeInTheDocument();
  });
});
