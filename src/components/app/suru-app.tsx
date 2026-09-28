"use client";

import { useEffect, useRef } from "react";
import * as RD from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "sonner";
import { useTasks } from "@/lib/store/tasks";
import { resolveTheme, useSettings } from "@/lib/store/settings";
import { useUi } from "@/lib/store/ui";
import { useHydrated, useMediaQuery, useNow } from "@/hooks/use-misc";
import { useGlobalShortcuts } from "@/hooks/use-shortcuts";
import { TooltipProvider } from "../ui/menu";
import { SidebarContent } from "../layout/sidebar";
import { MobileHeader, MobileTabBar } from "../layout/mobile-nav";
import { Dashboard } from "../dashboard/dashboard";
import { TaskView } from "../tasks/task-view";
import { TaskEditor } from "../tasks/task-editor";
import { AssistantPanel } from "../ai/assistant-panel";
import { BreakdownDialog } from "../ai/breakdown-dialog";
import { ConfirmDialogs, SettingsDialog, ShortcutsDialog, WelcomeDialog } from "../dialogs/dialogs";
import { AppSkeleton } from "./app-skeleton";

export function SuruApp() {
  const hydrated = useHydrated();
  if (!hydrated) return <AppSkeleton />;
  return <App />;
}

function App() {
  const now = useNow();
  const view = useUi((s) => s.view);
  const aiOpen = useUi((s) => s.aiOpen);
  const setAiOpen = useUi((s) => s.setAiOpen);
  const theme = useSettings((s) => s.theme);
  const wide = useMediaQuery("(min-width: 1280px)");
  const mainRef = useRef<HTMLElement>(null);

  useGlobalShortcuts();

  // First run: seed sample data so the product never opens empty.
  useEffect(() => {
    useTasks.getState().ensureSeeded();
  }, []);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "suru:tasks") useTasks.persist.rehydrate();
      if (e.key === "suru:settings") useSettings.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Theme
  useEffect(() => {
    const apply = () => document.documentElement.setAttribute("data-theme", resolveTheme(theme));
    apply();
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [view]);

  const resolved = resolveTheme(theme);

  return (
    <TooltipProvider delayDuration={350} skipDelayDuration={150}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
      >
        Skip to content
      </a>
      <div className="flex h-dvh overflow-hidden bg-bg text-fg">
        <aside className="hidden w-[252px] shrink-0 border-r border-line bg-bg-subtle lg:block" aria-label="Sidebar">
          <SidebarContent now={now} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader now={now} />
          <main id="main" ref={mainRef} tabIndex={-1} className="workspace-glow min-h-0 flex-1 overflow-y-auto outline-none">
            <div className="mx-auto w-full max-w-[960px] px-4 pb-32 pt-6 sm:px-6 md:pb-16 lg:px-10 lg:pt-10">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  {view === "home" ? <Dashboard now={now} /> : <TaskView view={view} now={now} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* AI panel — docked on wide screens */}
        {wide && (
          <AnimatePresence initial={false}>
            {aiOpen && (
              <motion.aside
                key="ai"
                aria-label="Suru AI assistant"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 400, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 40 }}
                className="h-dvh shrink-0 overflow-hidden border-l border-line bg-bg-subtle"
              >
                <div className="h-full w-[400px]">
                  <AssistantPanel onClose={() => setAiOpen(false)} />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* AI panel — slide-over / bottom sheet on smaller screens */}
      {!wide && (
        <RD.Root open={aiOpen} onOpenChange={setAiOpen}>
          <AnimatePresence>
            {aiOpen && (
              <RD.Portal forceMount>
                <RD.Overlay asChild forceMount>
                  <motion.div
                    className="fixed inset-0 z-40 bg-black/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                </RD.Overlay>
                <RD.Content asChild forceMount aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 380, damping: 40 }}
                    className="fixed inset-x-0 bottom-0 z-40 h-[88dvh] overflow-hidden rounded-t-2xl border border-line-strong bg-bg-subtle shadow-lg outline-none sm:inset-y-3 sm:left-auto sm:right-3 sm:h-auto sm:w-[420px] sm:rounded-2xl"
                  >
                    <RD.Title className="sr-only">Suru AI</RD.Title>
                    <AssistantPanel onClose={() => setAiOpen(false)} />
                  </motion.div>
                </RD.Content>
              </RD.Portal>
            )}
          </AnimatePresence>
        </RD.Root>
      )}

      <MobileTabBar />
      <TaskEditor />
      <BreakdownDialog />
      <SettingsDialog />
      <ShortcutsDialog />
      <ConfirmDialogs />
      <WelcomeDialog />
      <Toaster
        theme={resolved}
        position="bottom-right"
        mobileOffset={{ bottom: 84 }}
        gap={8}
        toastOptions={{
          classNames: {
            toast:
              "!bg-surface-3 !border !border-line-strong !text-fg !rounded-xl !shadow-lg !font-sans !text-[13px] !gap-2",
            description: "!text-fg-muted !text-[12px] !line-clamp-1",
            actionButton: "!bg-accent !text-accent-fg !font-medium !rounded-md",
            success: "[&_[data-icon]]:!text-accent",
          },
        }}
      />
    </TooltipProvider>
  );
}
