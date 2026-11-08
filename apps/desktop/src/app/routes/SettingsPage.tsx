import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUiStore, ZOOM_MAX, ZOOM_MIN, type Theme } from "@/lib/store";
import { shippedLocales } from "@/i18n/config";
import { Section, Row } from "@/components/settings/Section";
import { selectCls } from "@/components/settings/inputCls";
import { cn } from "@/lib/cn";
import {
  IconDarkOutlineMedium,
  IconFollowsystemOutlineMedium,
  IconLightOutlineMedium,
  IconPersonalizationOutlineMedium,
} from "@/components/icons/dsh";
import { Minus, Plus, RefreshCw, Cpu, CheckCircle2 } from "lucide-react";

const THEME_CUBES: readonly { mode: Theme; label: string; Icon: typeof IconLightOutlineMedium }[] = [
  { mode: "light", label: "Light", Icon: IconLightOutlineMedium },
  { mode: "warm", label: "Warm", Icon: IconPersonalizationOutlineMedium },
  { mode: "dark", label: "Dark", Icon: IconDarkOutlineMedium },
  { mode: "system", label: "System", Icon: IconFollowsystemOutlineMedium },
];

export function SettingsPage() {
  const { i18n } = useTranslation(["settings", "common"]);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const zoom = useUiStore((s) => s.zoom);
  const setZoom = useUiStore((s) => s.setZoom);
  const resetZoom = useUiStore((s) => s.resetZoom);
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);

  const [modelStatus, setModelStatus] = useState<"checking" | "active" | "offline">("checking");

  useEffect(() => {
    let mounted = true;
    fetch("http://127.0.0.1:8000/v1/models")
      .then((res) => {
        if (mounted) {
          setModelStatus(res.ok ? "active" : "offline");
        }
      })
      .catch(() => {
        if (mounted) {
          setModelStatus("offline");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-full w-full bg-background pb-20 pt-8">
      <div className="mx-auto max-w-[680px] px-6">
        <header className="border-b border-border pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-text">ScienceAI Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Configure your ScienceAI environment and preferences.
          </p>
        </header>

        {/* ---- Local Scientific Model ---- */}
        <Section
          title="Active Model"
          hint="ScienceAI is powered by your fine-tuned local scientific language model."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface-2 p-3.5 border border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <Cpu size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-text">
                      local-scientific/qwen3.5-9b-scientific
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-ok/10 px-2 py-0.5 text-[11px] font-medium text-ok">
                      <CheckCircle2 size={12} />
                      {modelStatus === "active" ? "Active" : modelStatus === "checking" ? "Checking..." : "Standby"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Qwen3.5-9B (4-bit NF4) + Scientific Pipeline LoRA Adapter
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-input border border-border bg-surface-2 px-3 py-2">
                <span className="text-muted block text-[11px]">Inference Server</span>
                <span className="font-mono text-text">http://127.0.0.1:8000/v1</span>
              </div>
              <div className="rounded-input border border-border bg-surface-2 px-3 py-2">
                <span className="text-muted block text-[11px]">Adapter Source</span>
                <span className="truncate font-mono text-text block" title="qwen35_9b_balanced_20step_adapter">
                  qwen35_9b_balanced_adapter
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* ---- Appearance ---- */}
        <Section
          title="Appearance"
          hint="Customize the look and feel of the ScienceAI interface."
        >
          <Row
            title="Theme"
            hint="Choose light, dark, warm, or match your operating system."
            control={
              <div className="flex items-center gap-2">
                {THEME_CUBES.map(({ mode, label, Icon }) => {
                  const active = theme === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setTheme(mode)}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-input border px-3 text-xs font-medium transition-colors",
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface-2 text-muted hover:bg-border/50 hover:text-text",
                      )}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            }
          />

          <Row
            title="App Zoom"
            hint="Scale the entire user interface up or down."
            control={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(ZOOM_MIN, zoom - 0.1))}
                  disabled={zoom <= ZOOM_MIN}
                  className="flex h-8 w-8 items-center justify-center rounded-input border border-border bg-surface-2 text-muted hover:bg-border/50 hover:text-text disabled:opacity-40"
                  aria-label="Zoom out"
                >
                  <Minus size={14} />
                </button>
                <span className="w-14 text-center font-mono text-xs text-text">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(ZOOM_MAX, zoom + 0.1))}
                  disabled={zoom >= ZOOM_MAX}
                  className="flex h-8 w-8 items-center justify-center rounded-input border border-border bg-surface-2 text-muted hover:bg-border/50 hover:text-text disabled:opacity-40"
                  aria-label="Zoom in"
                >
                  <Plus size={14} />
                </button>
                {zoom !== 1 && (
                  <button
                    onClick={resetZoom}
                    className="flex h-8 items-center gap-1 rounded-input border border-border bg-surface-2 px-2 text-xs text-muted hover:bg-border/50 hover:text-text"
                    title="Reset zoom to 100%"
                  >
                    <RefreshCw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            }
          />
        </Section>

        {/* ---- Language ---- */}
        <Section
          title="Language"
          hint="Select the display language for ScienceAI."
        >
          <Row
            title="Language"
            control={
              <select
                aria-label="Language"
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value);
                  void i18n.changeLanguage(e.target.value);
                }}
                className={selectCls("w-[160px]")}
              >
                {shippedLocales().map((meta) => (
                  <option key={meta.code} value={meta.code}>
                    {meta.nativeName} ({meta.label})
                  </option>
                ))}
              </select>
            }
          />
        </Section>
      </div>
    </div>
  );
}
