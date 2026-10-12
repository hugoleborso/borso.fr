export function requireAt<Item>(items: ArrayLike<Item | undefined>, index: number): Item {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(`expected an item at index ${String(index)} of ${String(items.length)}`);
  }
  return item;
}
