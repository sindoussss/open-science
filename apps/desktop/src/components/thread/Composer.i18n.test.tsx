import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkflowStarters } from "./WorkflowStarters";
import { renderAt } from "@/test/render";

describe("WorkflowStarters strings (i18n)", () => {
  it("renders the welcome copy and a starter card's title/description in English", () => {
    render(<WorkflowStarters onPick={() => {}} />);
    expect(screen.getByText("What should we look into?")).toBeInTheDocument();
    expect(screen.getByText("Run a demo analysis, end to end")).toBeInTheDocument();
    expect(
      screen.getByText("Simulate a dataset, fit a model, and produce a figure and a traceable report."),
    ).toBeInTheDocument();
  });
});

describe("LiveSessionPage strings (i18n)", () => {
  it("does not render the legacy OpenCode runtime card in English", async () => {
    renderAt("/live");
    expect(screen.queryByText("OpenCode runtime")).not.toBeInTheDocument();
  });
});
