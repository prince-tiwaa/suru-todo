"use client";

import { CalendarDays, Flag, X } from "lucide-react";
import type { Priority, WorkspaceId } from "@/lib/types";
import { PRIORITIES, WORKSPACES, WORKSPACE_META } from "@/lib/constants";
import { formatDue, fromInputs, quickDates, toDateInput, toTimeInput } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "../ui/menu";
import { PriorityIcon, WorkspaceDot } from "../ui/misc";

const chip =
  "inline-flex h-7 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg border px-2 text-[12.5px] transition-colors outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]";
const chipIdle = "border-line text-fg-faint hover:border-line-strong hover:text-fg-muted";
const chipSet = "border-line-strong bg-surface-2 text-fg";

export function DatePicker({
  value,
  hasTime,
  onChange,
  now,
  compactLabel,
}: {
  value?: string;
  hasTime?: boolean;
  onChange: (v: { dueDate?: string; hasTime: boolean }) => void;
  now: Date;
  compactLabel?: boolean;
}) {
  const date = toDateInput(value);
  const time = hasTime ? toTimeInput(value) : "";
  return (
    <Popover>
      <PopoverTrigger className={cn(chip, value ? chipSet : chipIdle)} aria-label="Set due date">
        <CalendarDays className="h-3.5 w-3.5" />
        <span className={cn(compactLabel && !value && "@max-xl:hidden")}>
          {value ? formatDue(value, hasTime, now) : "Due date"}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[248px]">
        <div className="grid grid-cols-2 gap-1">
          {quickDates(now).map((q) => (
            <PopoverClose
              key={q.id}
              className="rounded-lg px-2 py-1.5 text-left text-[12.5px] text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              onClick={() => onChange({ dueDate: q.date, hasTime: false })}
            >
              {q.label}
              <span className="block font-mono text-[10.5px] text-fg-faint">
                {new Date(q.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </PopoverClose>
          ))}
        </div>
        <div className="mt-2 space-y-1.5 border-t border-line pt-2">
          <label className="flex items-center justify-between gap-2 text-[12px] text-fg-faint">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => onChange(fromInputs(e.target.value, time))}
              className="h-8 w-[140px] rounded-lg border border-line bg-bg-subtle px-2 text-[12.5px] text-fg outline-none focus:border-line-strong"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-[12px] text-fg-faint">
            Time
            <input
              type="time"
              value={time}
              disabled={!date}
              onChange={(e) => onChange(fromInputs(date, e.target.value))}
              className="h-8 w-[140px] rounded-lg border border-line bg-bg-subtle px-2 text-[12.5px] text-fg outline-none focus:border-line-strong disabled:opacity-40"
            />
          </label>
        </div>
        {value && (
          <PopoverClose
            onClick={() => onChange({ dueDate: undefined, hasTime: false })}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] text-fg-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X className="h-3 w-3" /> Remove date
          </PopoverClose>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PriorityPicker({
  value,
  onChange,
  compactLabel,
}: {
  value?: Priority;
  onChange: (p: Priority) => void;
  compactLabel?: boolean;
}) {
  const set = value && value !== "none";
  const label = PRIORITIES.find((p) => p.id === value)?.label;
  return (
    <Menu>
      <MenuTrigger className={cn(chip, set ? chipSet : chipIdle)} aria-label="Set priority">
        {set ? <PriorityIcon priority={value!} /> : <Flag className="h-3.5 w-3.5" />}
        <span className={cn(compactLabel && !set && "@max-xl:hidden")}>{set ? label : "Priority"}</span>
      </MenuTrigger>
      <MenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <MenuLabel>Priority</MenuLabel>
        <MenuRadioGroup value={value ?? "none"} onValueChange={(v) => onChange(v as Priority)}>
          {PRIORITIES.map((p) => (
            <MenuRadioItem key={p.id} value={p.id}>
              <PriorityIcon priority={p.id} />
              {p.label}
              <span className="ml-auto pr-3 font-mono text-[10.5px] text-fg-faint">{p.short}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

export function WorkspacePicker({
  value,
  onChange,
  compactLabel,
}: {
  value: WorkspaceId;
  onChange: (w: WorkspaceId) => void;
  compactLabel?: boolean;
}) {
  return (
    <Menu>
      <MenuTrigger className={cn(chip, chipIdle, "text-fg-muted")} aria-label={`Workspace: ${WORKSPACE_META[value].label}`}>
        <WorkspaceDot id={value} />
        <span className={cn(compactLabel && "@max-xl:hidden")}>{WORKSPACE_META[value].label}</span>
      </MenuTrigger>
      <MenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <MenuLabel>Workspace</MenuLabel>
        <MenuRadioGroup value={value} onValueChange={(v) => onChange(v as WorkspaceId)}>
          {WORKSPACES.map((w) => (
            <MenuRadioItem key={w.id} value={w.id}>
              <WorkspaceDot id={w.id} />
              {w.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
