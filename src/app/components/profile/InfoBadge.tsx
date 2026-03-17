/**
 * src/app/components/profile/InfoBadge.tsx — Reusable info badge with tooltip.
 *
 * Shows a value with a clickable info icon that reveals a tooltip on click.
 * Used in AI config file rows and section-level info icons.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface InfoBadgeProps {
  value: string;
  tooltip: string;
  valueClass?: string;
}

/** A value with a clickable info icon that shows a tooltip. */
export function InfoBadge({ value, tooltip, valueClass }: InfoBadgeProps) {
  const [show, setShow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <span className="relative inline-flex items-center gap-0.5">
      <span className={valueClass}>{value}</span>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        onBlur={() => setShow(false)}
        className="text-th-text-muted hover:text-th-text-secondary transition-colors leading-none"
        aria-label={`Info: ${value}`}
      >
        <InfoCircleIcon size={12} />
      </button>
      {show && <PortalTooltip anchorRef={btnRef} tooltip={tooltip} width={192} />}
    </span>
  );
}

interface InfoIconButtonProps {
  tooltip: string;
}

/** Standalone info icon button with tooltip — for section headings. */
export function InfoIconButton({ tooltip }: InfoIconButtonProps) {
  const [show, setShow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        onBlur={() => setShow(false)}
        className="text-th-text-muted hover:text-th-text-secondary transition-colors leading-none ml-1"
        aria-label="Section info"
      >
        <InfoCircleIcon size={14} />
      </button>
      {show && <PortalTooltip anchorRef={btnRef} tooltip={tooltip} width={224} />}
    </span>
  );
}

function InfoCircleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className="inline-block">
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM7.25 5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM7.25 7a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V7Z" />
    </svg>
  );
}

/** Renders a tooltip via portal so it's never clipped by overflow containers. */
function PortalTooltip({ anchorRef, tooltip, width }: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  tooltip: string;
  width: number;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Center on the icon, then clamp so tooltip stays within viewport
    const centerX = rect.left + rect.width / 2;
    const pad = 8;
    const left = Math.max(pad, Math.min(window.innerWidth - width - pad, centerX - width / 2));
    setStyle({
      position: 'fixed',
      top: rect.top - pad,
      left,
      width,
      transform: 'translateY(-100%)',
      opacity: 1,
    });
  }, [anchorRef, width]);

  return createPortal(
    <span
      className="px-2.5 py-2 rounded bg-slate-900 text-white text-xs leading-snug shadow-lg z-[9999] pointer-events-none"
      style={style}
    >
      {tooltip}
    </span>,
    document.body,
  );
}
