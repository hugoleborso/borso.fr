import { gearItemSaveToolInputSchema, gearItemToolCreateSchema } from './gear-items.schema';
import {
  addGearItemFromTool,
  buildGearToolUpdate,
  confirmUpdate,
  defineDeletion,
  defineTool,
  parseToolFields,
  patchGearItem,
  removeGearItemByReference,
  resolveGearHolding,
  resolveGearItemId,
  resolveSessionId,
} from './gear-items.service';

// @FollowsBlueprint controller-dispatch
export const GEAR_ITEM_TOOLS = [
  defineTool({
    name: 'save_gear_item',
    description:
      "Add a concert's gear item (`label`), or, with `item`, change it; `holder` is a name, `me`, `venue` or null for still to find.",
    routes: ['POST /api/gear-items/:sessionId', 'PUT /api/gear-items/:sessionId/:id'],
    inputSchema: gearItemSaveToolInputSchema,
    run: async ({ session, item, label, holder }, actor) => {
      const sessionId = await resolveSessionId(session, actor.now);
      const holding = await resolveGearHolding(holder, actor.memberId);
      if (item === undefined) {
        const fields = parseToolFields(gearItemToolCreateSchema, { label });
        const outcome = await addGearItemFromTool(sessionId, fields.label, holding);
        if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
        return { kind: 'answered', body: { id: outcome.item.id } };
      }
      const id = await resolveGearItemId(sessionId, item);
      const update = buildGearToolUpdate(label, holding);
      const outcome = await patchGearItem(sessionId, id, update);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, update) };
    },
  }),
];

export const GEAR_ITEM_DELETION = defineDeletion({
  route: 'DELETE /api/gear-items/:sessionId/:id',
  remove: async (reference, actor) => {
    const outcome = await removeGearItemByReference(reference, actor.now);
    if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
    return { kind: 'answered', body: { id: outcome.id, deleted: true } };
  },
});
