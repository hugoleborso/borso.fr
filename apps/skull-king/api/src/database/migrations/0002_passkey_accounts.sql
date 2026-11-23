CREATE TABLE "account_game" (
	"account_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	CONSTRAINT "account_game_account_id_game_id_pk" PRIMARY KEY("account_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_secret" (
	"id" integer PRIMARY KEY NOT NULL,
	"hmac_key" "bytea" NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"credential_id" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"public_key" "bytea" NOT NULL,
	"counter" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenge" (
	"challenge" text PRIMARY KEY NOT NULL,
	"account_id" uuid,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player" ADD COLUMN "account_id" uuid;