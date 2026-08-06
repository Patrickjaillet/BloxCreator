import Sortable from "sortablejs";

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

export function moveInArray<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return [...items];
  }
  const copy = [...items];
  [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  return copy;
}
