"use client";

import * as RD from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Visually hide the header (title is still announced to screen readers). */
  hideHeader?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  onOpenAutoFocus?: (e: Event) => void;
}

const widths = { sm: "sm:max-w-[400px]", md: "sm:max-w-[520px]", lg: "sm:max-w-[640px]" };

/**
 * Accessible dialog (Radix) with motion. Centered card on desktop,
 * bottom sheet on phones.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  children,
  footer,
  size = "md",
  className,
  onOpenAutoFocus,
}: DialogProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </RD.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
              <RD.Content asChild forceMount onOpenAutoFocus={onOpenAutoFocus}>
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.8 }}
                  className={cn(
                    "pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line-strong bg-surface shadow-lg outline-none",
                    "rounded-t-2xl pb-safe sm:rounded-2xl sm:pb-0",
                    widths[size],
                    className,
                  )}
                >
                  <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong sm:hidden" aria-hidden />
                  <div className={cn("flex items-start gap-3 px-5 pt-4 sm:pt-5", hideHeader && "sr-only")}>
                    <div className="min-w-0 flex-1">
                      <RD.Title className="text-[15px] font-semibold tracking-tight text-fg">{title}</RD.Title>
                      {description ? (
                        <RD.Description className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                          {description}
                        </RD.Description>
                      ) : (
                        <RD.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</RD.Description>
                      )}
                    </div>
                    <RD.Close
                      className="-mr-1.5 -mt-1 grid h-8 w-8 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </RD.Close>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div>
                  {footer ? (
                    <div className="flex items-center gap-2 border-t border-line bg-surface-2/60 px-5 py-3">{footer}</div>
                  ) : null}
                </motion.div>
              </RD.Content>
            </div>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}
