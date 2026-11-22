CREATE TABLE "game" (
	"id" uuid PRIMARY KEY NOT NULL,
	"join_code" text NOT NULL,
	"phase" text NOT NULL,
	"current_round" integer NOT NULL,
	"rematch_join_code" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "join_code_claim" (
	"join_code" text PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"seat" integer NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_entry" (
	"game_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"bid" integer,
	"tricks" integer,
	"standard_fourteen" integer NOT NULL,
	"black_fourteen" integer NOT NULL,
	"mermaid_by_pirate" integer NOT NULL,
	"pirate_by_skull_king" integer NOT NULL,
	"skull_king_by_mermaid" integer NOT NULL,
	"loot" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "round_entry_game_id_round_number_player_id_pk" PRIMARY KEY("game_id","round_number","player_id")
);
--> statement-breakpoint
CREATE TABLE "round" (
	"game_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"is_kraken_played" boolean NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "round_game_id_round_number_pk" PRIMARY KEY("game_id","round_number")
);
--> statement-breakpoint
CREATE TABLE "socket_connection" (
	"connection_id" text PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
