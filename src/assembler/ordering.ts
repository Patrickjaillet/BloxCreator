import Sortable from "sortablejs";

/** Drag-and-drop reordering of the middle (non-pinned) block list (spec 8.2). */
export function createSortableList(
  container: HTMLElement,
  onReorder: (orderedBlockIds: number[]) => void,
): Sortable {
  return Sortable.create(container, {
    animation: 150,
    handle: ".assembler-row__handle",
    onEnd: () => {
      const orderedBlockIds = Array.from(container.children).map((el) =>
        Number((el as HTMLElement).dataset.blockId),
      );
      onReorder(orderedBlockIds);
    },
  });
}

/** Keyboard/mouse-accessible alternative to drag-and-drop (spec 8.2). */
export function moveInArray<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return [...items];
  }
  const copy = [...items];
  [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  return copy;
}
