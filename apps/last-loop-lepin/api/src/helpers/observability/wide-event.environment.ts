// @FollowsBlueprint environment-reader
export function readServiceStage(): string | undefined {
  const stage = process.env.STAGE;
  return stage === undefined || stage === '' ? undefined : stage;
}
