import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderAt } from "@/test/render";
import { useRuntimeStore } from "@/lib/runtime";

const RUNTIME_STATUS = useRuntimeStore.getState().status;
afterEach(() => {
  useRuntimeStore.setState({ status: RUNTIME_STATUS, error: null });
  vi.useRealTimers();
});

describe("a session pane while the runtime is starting", () => {
  it("says nothing about a runtime that is still connecting", async () => {
    useRuntimeStore.setState({ status: "connecting", error: null });
    renderAt("/live");
    expect(await screen.findByPlaceholderText("Starting the runtime…")).toBeInTheDocument();
    expect(screen.queryByText("OpenCode runtime")).not.toBeInTheDocument();
    expect(screen.queryByText("Starting the local runtime…")).not.toBeInTheDocument();
    expect(screen.queryByText(/OpenCode · /)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
  });

  it("explains the wait once it is long enough to notice", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useRuntimeStore.setState({ status: "connecting", error: null });
    renderAt("/live");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6100);
    });
    expect(screen.getByText("Starting the local runtime…")).toBeInTheDocument();
    expect(screen.queryByText("OpenCode runtime")).not.toBeInTheDocument();
  });

  it("does not show legacy OpenCode badge or connect button when offline", async () => {
    useRuntimeStore.setState({ status: "offline", error: null });
    renderAt("/live");
    expect(screen.queryByText("OpenCode runtime")).not.toBeInTheDocument();
    expect(screen.queryByText("OpenCode · offline")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
  });
});
