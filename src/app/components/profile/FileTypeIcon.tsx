/**
 * src/app/components/profile/FileTypeIcon.tsx — File/folder type icon.
 *
 * Small SVG icon to distinguish files from directories in AI signal tables.
 */

import React from 'react';

/** Small icon indicating file or folder. Defaults to file icon if type is undefined. */
export function FileTypeIcon({ type }: { type?: 'file' | 'directory' }) {
  if (type === 'directory') {
    return (
      <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" className="text-amber-500 flex-shrink-0" aria-label="Folder">
        <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.172a1.5 1.5 0 0 1 1.06.44l.829.828A.5.5 0 0 0 7.914 3.5H13.5A1.5 1.5 0 0 1 15 5v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9Z" />
      </svg>
    );
  }
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" className="text-th-text-muted flex-shrink-0" aria-label="File">
      <path d="M4 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.414a1 1 0 0 0-.293-.707l-3.414-3.414A1 1 0 0 0 9.586 1H4Zm5 1.5L12.5 6H10a1 1 0 0 1-1-1V2.5Z" />
    </svg>
  );
}
