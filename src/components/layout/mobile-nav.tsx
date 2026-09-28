"use client";

import * as RD from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { CalendarRange, CheckCircle2, Home, Menu as MenuIcon, Plus, Sparkles, Sun } from "lucide-react";
import type { ViewId } from "@/lib/types";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils";
import { Logo } from "../ui/misc";
import { SidebarContent } from "./sidebar";

export function MobileHeader({ now }: { now: Date }) {
  const open = useUi((s) => s.mobileMenuOpen);
  const setOpen = useUi((s) => s.setMobileMenuOpen);
  const setAiOpen = useUi((s) => s.setAiOpen);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/80 px-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <MenuIcon className="h-[18px] w-[18px]" />
        </button>
        <Logo />
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-fg-muted transition-colors hover:text-fg"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Ask AI
        </button>
      </header>

      <RD.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open && (
            <RD.Portal forceMount>
              <RD.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/55 lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </RD.Overlay>
              <RD.Content asChild forceMount>
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 420, damping: 40 }}
                  className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-line bg-bg-subtle pb-safe outline-none lg:hidden"
                >
                  <RD.Title className="sr-only">Navigation</RD.Title>
                  <RD.Description className="sr-only">Views, workspaces and settings</RD.Description>
                  <SidebarContent now={now} layoutGroup="drawer" />
                </motion.div>
              </RD.Content>
            </RD.Portal>
          )}
        </AnimatePresence>
      </RD.Root>
    </>
  );
}

const TABS: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "today", label: "Today", icon: Sun },
  { id: "upcoming", label: "Upcoming", icon: CalendarRange },
  { id: "completed", label: "Done", icon: CheckCircle2 },
];

export function MobileTabBar() {
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  const focusCommandBar = useUi((s) => s.focusCommandBar);

  const tab = (t: (typeof TABS)[number]) => {
    const active = view === t.id;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setView(t.id)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
          active ? "text-fg" : "text-fg-faint",
        )}
      >
        <t.icon className={cn("h-5 w-5", active && "text-accent")} strokeWidth={active ? 2.2 : 1.8} />
        {t.label}
      </button>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 pb-safe backdrop-blur-xl md:hidden"
    >
      <div className="flex h-16 items-stretch px-2">
        {TABS.slice(0, 2).map(tab)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label="Add task"
            onClick={() => {
              if (view === "completed") setView("home");
              document.getElementById("main")?.scrollTo({ top: 0, behavior: "smooth" });
              requestAnimationFrame(focusCommandBar);
            }}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-fg shadow-glow transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  );
}
