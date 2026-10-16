CREATE TABLE "memory_alias" (
	"entity_slug" text NOT NULL,
	"kind" text NOT NULL,
	"normalized_value" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "memory_alias_pk" PRIMARY KEY("entity_slug","kind","normalized_value")
);
--> statement-breakpoint
CREATE TABLE "memory_change_batch" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"run_id" text,
	"actor" text NOT NULL,
	"applied_at" timestamp with time zone NOT NULL,
	"result" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_citation" (
	"entity_slug" text NOT NULL,
	"source_ref" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "memory_citation_pk" PRIMARY KEY("entity_slug","source_ref")
);
--> statement-breakpoint
CREATE TABLE "memory_commitment" (
	"slug" text PRIMARY KEY NOT NULL,
	"direction" text,
	"counterpart" text,
	"action" text,
	"due" text,
	"status" text NOT NULL,
	"attributes" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_document" (
	"slug" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"content_type" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_draft" (
	"slug" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"recipients" text NOT NULL,
	"subject" text,
	"link" text,
	"status" text NOT NULL,
	"created_on" text NOT NULL,
	"sent_on" text,
	"source_ref" text,
	"proposal_slug" text,
	"attributes" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_entity" (
	"slug" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text NOT NULL,
	"attributes" text NOT NULL,
	"closeness" integer,
	"closeness_reason" text,
	"confidentiality" text,
	"archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor" text NOT NULL,
	"token_name" text,
	"run_id" text,
	"operation" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"before" text,
	"after" text,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_fact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_slug" text NOT NULL,
	"section" text NOT NULL,
	"key" text,
	"value" text NOT NULL,
	"position" integer NOT NULL,
	"since" text,
	"until" text,
	"seen" text,
	"source_ref" text,
	"inferred" boolean DEFAULT false NOT NULL,
	"extra" text,
	"raw" text,
	"learned_on" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_focus_item" (
	"rank" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"why" text,
	"horizon" text
);
--> statement-breakpoint
CREATE TABLE "memory_journal_entry" (
	"slug" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_proposal" (
	"slug" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"priority" text NOT NULL,
	"created_on" text NOT NULL,
	"expires_on" text,
	"attributes" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_relation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_slug" text NOT NULL,
	"verb" text NOT NULL,
	"to_slug" text NOT NULL,
	"position" integer NOT NULL,
	"since" text,
	"until" text,
	"seen" text,
	"source_ref" text,
	"inferred" boolean DEFAULT false NOT NULL,
	"extra" text,
	"raw" text,
	"learned_on" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_source" (
	"slug" text PRIMARY KEY NOT NULL,
	"origin" text,
	"occurred_on" text,
	"title" text,
	"confidentiality" text,
	"metadata" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_todo" (
	"id" text PRIMARY KEY NOT NULL,
	"list" text NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"due_date" text,
	"commitment_slug" text,
	"source_ref" text,
	"added_on" text,
	"done_on" text,
	"extra" text NOT NULL,
	"removed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_verb" (
	"name" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"link_length" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "memory_alias_normalized_value_idx" ON "memory_alias" USING btree ("normalized_value");--> statement-breakpoint
CREATE INDEX "memory_citation_source_ref_idx" ON "memory_citation" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "memory_event_occurred_at_idx" ON "memory_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "memory_fact_entity_slug_idx" ON "memory_fact" USING btree ("entity_slug");--> statement-breakpoint
CREATE INDEX "memory_relation_from_slug_idx" ON "memory_relation" USING btree ("from_slug");--> statement-breakpoint
CREATE INDEX "memory_relation_to_slug_idx" ON "memory_relation" USING btree ("to_slug");--> statement-breakpoint
CREATE INDEX "memory_todo_list_idx" ON "memory_todo" USING btree ("list");