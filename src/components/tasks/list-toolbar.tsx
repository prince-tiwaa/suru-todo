"use client";

import { ArrowDownUp, ListFilter, Search, Tag, X } from "lucide-react";
import type { Priority, SortKey, StatusFilter } from "@/lib/types";
import { PRIORITIES } from "@/lib/constants";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils";
import {
  Menu,
  MenuCheckItem,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { PriorityIcon, Segmented } from "../ui/misc";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "smart", label: "Smart order" },
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "created", label: "Newest first" },
  { id: "title", label: "Alphabetical" },
];

const trigger =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] transition-colors outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] data-[state=open]:bg-surface-2";

export function ListToolbar({ tags, showStatus }: { tags: string[]; showStatus: boolean }) {
  const filters = useUi((s) => s.filters);
  const setFilters = useUi((s) => s.setFilters);
  const resetFilters = useUi((s) => s.resetFilters);

  const activeCount = filters.priorities.length + (filters.tag ? 1 : 0);
  const dirty = activeCount > 0 || !!filters.query;

  function togglePriority(p: Priority) {
    setFilters({
      priorities: filters.priorities.includes(p)
        ? filters.priorities.filter((x) => x !== p)
        : [...filters.priorities, p],
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-faint" />
        <label htmlFor="task-search" className="sr-only">
          Search tasks
        </label>
        <input
          id="task-search"
          type="search"
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
          onKeyDown={(e) => e.key === "Escape" && setFilters({ query: "" })}
          placeholder="Search tasks"
          className="h-8 w-full rounded-lg border border-line bg-surface/60 pl-8 pr-8 text-[13px] text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-line-strong focus:bg-surface [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setFilters({ query: "" })}
            className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-fg-faint hover:text-fg"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {showStatus && (
        <Segmented<StatusFilter>
          label="Status"
          value={filters.status}
          onChange={(status) => setFilters({ status })}
          options={[
            { value: "active", label: "Active" },
            { value: "completed", label: "Done" },
            { value: "all", label: "All" },
          ]}
        />
      )}

      <Menu>
        <MenuTrigger
          className={cn(
            trigger,
            activeCount ? "border-line-strong bg-surface-2 text-fg" : "border-line text-fg-muted hover:text-fg",
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
          Filter
          {activeCount > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded bg-accent px-1 font-mono text-[10px] font-semibold text-accent-fg">
              {activeCount}
            </span>
          )}
        </MenuTrigger>
        <MenuContent align="end" className="w-[220px]">
          <MenuLabel>Priority</MenuLabel>
          {PRIORITIES.map((p) => (
            <MenuCheckItem
              key={p.id}
              checked={filters.priorities.includes(p.id)}
              onCheckedChange={() => togglePriority(p.id)}
              onSelect={(e) => e.preventDefault()}
            >
              <PriorityIcon priority={p.id} /> {p.label}
            </MenuCheckItem>
          ))}
          {tags.length > 0 && (
            <>
              <MenuSeparator />
              <MenuLabel>Tag</MenuLabel>
              <div className="max-h-44 overflow-y-auto">
                {tags.map((t) => (
                  <MenuCheckItem
                    key={t}
                    checked={filters.tag === t}
                    onCheckedChange={() => setFilters({ tag: filters.tag === t ? null : t })}
                  >
                    <Tag className="h-3.5 w-3.5" /> {t}
                  </MenuCheckItem>
                ))}
              </div>
            </>
          )}
        </MenuContent>
      </Menu>

      <Menu>
        <MenuTrigger className={cn(trigger, "border-line text-fg-muted hover:text-fg")} aria-label="Sort tasks">
          <ArrowDownUp className="h-3.5 w-3.5" />
          <span className="max-sm:hidden">{SORTS.find((s) => s.id === filters.sort)?.label}</span>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuLabel>Sort by</MenuLabel>
          <MenuRadioGroup value={filters.sort} onValueChange={(v) => setFilters({ sort: v as SortKey })}>
            {SORTS.map((s) => (
              <MenuRadioItem key={s.id} value={s.id}>
                {s.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      {dirty && (
        <button
          type="button"
          onClick={resetFilters}
          className="h-8 rounded-lg px-2 text-[12.5px] text-fg-faint transition-colors hover:text-fg"
        >
          Reset
        </button>
      )}
    </div>
  );
}
