'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * Shared selection state for bulk-action list pages. Tracks a Set of IDs,
 * exposes convenience setters for toggling a single row, toggling
 * "select all on page", and clearing. Returned booleans (`allSelected`,
 * `someSelected`) let the list header render a tri-state checkbox.
 *
 * Kept deliberately light: no URL persistence, no cross-page selection —
 * pages tend to be 15–20 rows so the scope is one page at a time.
 */
export function useBulkSelection(pageIds: readonly string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const toggleAllOnPage = useCallback(
    (ids: readonly string[]) => {
      setSelected((prev) => {
        const all = ids.every((id) => prev.has(id));
        const next = new Set(prev);
        if (all) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        return next;
      });
    },
    [],
  );

  const { allSelected, someSelected, count } = useMemo(() => {
    let count = 0;
    let present = 0;
    for (const id of pageIds) {
      if (selected.has(id)) {
        count++;
        present++;
      }
    }
    return {
      allSelected: pageIds.length > 0 && present === pageIds.length,
      someSelected: present > 0 && present < pageIds.length,
      count,
    };
  }, [pageIds, selected]);

  const ids = useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    ids,
    count: selected.size,
    pageCount: count,
    allSelected,
    someSelected,
    toggle,
    clear,
    toggleAllOnPage,
    isSelected: (id: string) => selected.has(id),
  };
}
