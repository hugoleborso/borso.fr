export type ProductEventField = string | number | boolean | null;

export interface ProductEvent {
  readonly event: string;
  readonly [field: string]: ProductEventField;
}

// @FollowsBlueprint adapter-external-service
export function recordProductEvent(productEvent: ProductEvent): void {
  process.stdout.write(`${JSON.stringify(productEvent)}\n`);
}
