import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

(window as unknown as { __OS_WEB__?: boolean }).__OS_WEB__ = true;

const { SettingsPage } = await import("./SettingsPage");

async function renderAt(path: string) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings/:section" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

describe("ScienceAI Settings in web client", () => {
  it("renders ScienceAI settings without legacy provider controls", async () => {
    await renderAt("/settings/general");
    expect(screen.getByText("ScienceAI Settings")).toBeInTheDocument();
    expect(screen.getByText("local-scientific/qwen3.5-9b-scientific")).toBeInTheDocument();
    expect(screen.queryByText("OpenCode providers")).not.toBeInTheDocument();
  });
});
