"use client";

import * as DM from "@radix-ui/react-dropdown-menu";
import * as PO from "@radix-ui/react-popover";
import * as TT from "@radix-ui/react-tooltip";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const panel =
  "z-50 min-w-[190px] overflow-hidden rounded-xl border border-line-strong bg-surface p-1 shadow-lg outline-none " +
  "data-[state=open]:animate-[pop-in_140ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[pop-out_100ms_ease-in]";

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({ className, align = "start", ...props }: DM.DropdownMenuContentProps) {
  return (
    <DM.Portal>
      <DM.Content sideOffset={6} align={align} collisionPadding={12} className={cn(panel, className)} {...props} />
    </DM.Portal>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <DM.Label className="px-2 pb-1 pt-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
      {children}
    </DM.Label>
  );
}

export function MenuSeparator() {
  return <DM.Separator className="-mx-1 my-1 h-px bg-line" />;
}

const itemCls =
  "relative flex h-8 cursor-default select-none items-center gap-2 rounded-lg px-2 text-[13px] text-fg-muted outline-none " +
  "data-[highlighted]:bg-surface-3 data-[highlighted]:text-fg data-[disabled]:opacity-40";

export function MenuItem({ className, ...props }: DM.DropdownMenuItemProps) {
  return <DM.Item className={cn(itemCls, className)} {...props} />;
}

export function MenuCheckItem({
  checked,
  children,
  className,
  ...props
}: DM.DropdownMenuCheckboxItemProps) {
  return (
    <DM.CheckboxItem checked={checked} className={cn(itemCls, "pr-7", className)} {...props}>
      {children}
      <DM.ItemIndicator className="absolute right-2">
        <Check className="h-3.5 w-3.5 text-accent" />
      </DM.ItemIndicator>
    </DM.CheckboxItem>
  );
}

export function MenuRadioGroup(props: DM.DropdownMenuRadioGroupProps) {
  return <DM.RadioGroup {...props} />;
}

export function MenuRadioItem({ children, className, ...props }: DM.DropdownMenuRadioItemProps) {
  return (
    <DM.RadioItem className={cn(itemCls, "pr-7", className)} {...props}>
      {children}
      <DM.ItemIndicator className="absolute right-2">
        <Check className="h-3.5 w-3.5 text-accent" />
      </DM.ItemIndicator>
    </DM.RadioItem>
  );
}

/* ------------------------------ Popover ------------------------------ */

export const Popover = PO.Root;
export const PopoverTrigger = PO.Trigger;
export const PopoverClose = PO.Close;

export function PopoverContent({ className, align = "start", ...props }: PO.PopoverContentProps) {
  return (
    <PO.Portal>
      <PO.Content sideOffset={6} align={align} collisionPadding={12} className={cn(panel, "p-2", className)} {...props} />
    </PO.Portal>
  );
}

/* ------------------------------ Tooltip ------------------------------ */

export const TooltipProvider = TT.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TT.Root>
      <TT.Trigger asChild>{children}</TT.Trigger>
      <TT.Portal>
        <TT.Content
          side={side}
          sideOffset={6}
          className="z-[60] flex items-center gap-1.5 rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-xs text-fg shadow-md data-[state=delayed-open]:animate-[pop-in_120ms_ease-out]"
        >
          {content}
        </TT.Content>
      </TT.Portal>
    </TT.Root>
  );
}
