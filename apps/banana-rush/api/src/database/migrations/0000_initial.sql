CREATE TABLE "bid" (
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"amount" integer NOT NULL,
	"placed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "bid_game_id_player_id_round_number_pk" PRIMARY KEY("game_id","player_id","round_number")
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"join_code" text NOT NULL,
	"status" text NOT NULL,
	"max_players" integer NOT NULL,
	"round_timer_seconds" integer,
	"winning_score" integer NOT NULL,
	"crate_bananas" integer NOT NULL,
	"current_round" integer NOT NULL,
	"round_opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"nickname" text NOT NULL,
	"avatar" text NOT NULL,
	"stash_bananas" integer NOT NULL,
	"seat_order" integer NOT NULL,
	"is_host" boolean NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_result" (
	"game_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"crate_before" integer NOT NULL,
	"crate_after" integer NOT NULL,
	"outcomes" text NOT NULL,
	"resolved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "round_result_game_id_round_number_pk" PRIMARY KEY("game_id","round_number")
);
--> statement-breakpoint
CREATE TABLE "socket_connection" (
	"connection_id" text PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
