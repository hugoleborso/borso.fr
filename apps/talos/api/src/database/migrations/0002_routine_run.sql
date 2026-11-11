CREATE TABLE "routine_run" (
	"id" uuid PRIMARY KEY NOT NULL,
	"fired_at" timestamp with time zone NOT NULL,
	"trigger" text NOT NULL,
	"subject" text NOT NULL,
	"session_url" text
);
