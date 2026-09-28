"use client";

import { useEffect } from "react";
import type { ViewId } from "@/lib/types";
import { useUi } from "@/lib/store/ui";

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
};

const GOTO: Record<string, ViewId> = { h: "home", i: "inbox", t: "today", u: "upcoming", c: "completed" };

export function useGlobalShortcuts() {
  useEffect(() => {
    let gPressedAt = 0;

    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      // Always-available chords
      if (mod && k === "k") {
        e.preventDefault();
        if (ui.view === "completed") ui.setView("home");
        requestAnimationFrame(() => useUi.getState().focusCommandBar());
        return;
      }
      if (mod && k === "j") {
        e.preventDefault();
        ui.setAiOpen(!ui.aiOpen);
        return;
      }

      if (mod || e.altKey || isTyping(e.target)) return;
      // Leave keys alone while a dialog/menu is open
      if (ui.dialog || ui.editingId || document.querySelector("[role=menu],[role=dialog]")) return;

      if (Date.now() - gPressedAt < 900 && GOTO[k]) {
        e.preventDefault();
        ui.setView(GOTO[k]);
        gPressedAt = 0;
        return;
      }
      if (k === "g") {
        gPressedAt = Date.now();
        return;
      }
      if (k === "n" || k === "/") {
        e.preventDefault();
        if (ui.view === "completed") ui.setView("home");
        requestAnimationFrame(() => useUi.getState().focusCommandBar());
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        ui.openDialog("shortcuts");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
