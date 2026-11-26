-- A concert can put a prize on its public page, such as three beers drawn
-- among the registrants. prize_label is the words the coupon shows, and
-- prize_icon one of beer, gift, ticket or shirt (CONCERT_PRIZE_ICONS in
-- domain/concert-prize.core.ts). A null label shows no coupon, and a null
-- icon reads as beer.
--
-- Both columns stay nullable forever: DSQL accepts ADD COLUMN with no
-- constraint clause only, so the icon list is held by the API schema.
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "prize_label" text;
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "prize_icon" text;
