CREATE TABLE "avatar_claim" (
	"game_id" uuid NOT NULL,
	"avatar" text NOT NULL,
	CONSTRAINT "avatar_claim_game_id_avatar_pk" PRIMARY KEY("game_id","avatar")
);
--> statement-breakpoint
CREATE TABLE "seat_claim" (
	"game_id" uuid NOT NULL,
	"seat_order" integer NOT NULL,
	CONSTRAINT "seat_claim_game_id_seat_order_pk" PRIMARY KEY("game_id","seat_order")
);
--> statement-breakpoint
INSERT INTO "seat_claim" ("game_id", "seat_order") SELECT "game_id", "seat_order" FROM "player" ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "avatar_claim" ("game_id", "avatar") SELECT "game_id", "avatar" FROM "player" ON CONFLICT DO NOTHING;
