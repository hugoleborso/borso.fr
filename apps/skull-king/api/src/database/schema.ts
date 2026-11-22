// @FollowsBlueprint database-schema-barrel
export {
  accountTable,
  appSecretTable,
  passkeyTable,
  webauthnChallengeTable,
} from '../accounts/accounts.schema';
export {
  accountGameTable,
  gameTable,
  joinCodeClaimTable,
  playerTable,
  roundEntryTable,
  roundTable,
} from '../games/games.schema';
export { socketConnectionTable } from '../realtime/realtime.schema';
