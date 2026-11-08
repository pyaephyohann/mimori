import type { WidgetRecord } from "./catalog.ts";

/**
 * Pure list helpers for the client widget store. Kept free of React and
 * browser APIs so the remove-and-restore rules can be covered by `node:test`.
 */

export function sortByZ(widgets: readonly WidgetRecord[]): WidgetRecord[] {
  return [...widgets].sort((a, b) => a.config.z - b.config.z);
}

/** Returns the list without the widget with `id`; the list is unchanged if it is absent. */
export function withoutWidget(
  widgets: readonly WidgetRecord[],
  id: string,
): WidgetRecord[] {
  return widgets.filter((widget) => widget.id !== id);
}

/** Puts a widget back in z order. A widget that is already present is not duplicated. */
export function restoreWidget(
  widgets: readonly WidgetRecord[],
  widget: WidgetRecord,
): WidgetRecord[] {
  if (widgets.some((current) => current.id === widget.id)) {
    return sortByZ(widgets);
  }

  return sortByZ([...widgets, widget]);
}
