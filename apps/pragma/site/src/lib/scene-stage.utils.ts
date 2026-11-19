// @FollowsBlueprint utils-pure-module
export function isEventFromItself(target: EventTarget | null, currentTarget: EventTarget): boolean {
  return target === currentTarget;
}
