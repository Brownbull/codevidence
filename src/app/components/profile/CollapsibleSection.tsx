/**
 * src/app/components/profile/CollapsibleSection.tsx — Collapsible section wrapper.
 *
 * Wraps evidence section content with an expand/collapse toggle.
 * Shows title + optional count badge even when collapsed.
 */

import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  infoTooltip?: React.ReactNode;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  count,
  infoTooltip,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="bg-surface-raised rounded-lg border border-border p-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          className={`text-th-text-muted transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        <h3 className="text-base font-semibold text-th-text-primary">{title}</h3>
        {count !== undefined && (
          <span className="text-sm text-th-text-muted font-normal">({count})</span>
        )}
        {infoTooltip}
      </button>

      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}
