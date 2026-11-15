-- A band link is an address the whole band keeps on the band tab, such as a
-- shared folder of photos. Members type it in the app, so the addresses live
-- only in this table and never in the repository. Its id is chosen by the
-- device that creates it, so a retried create lands on the same row.
--
-- No DEFAULT now(): created_at comes from the service's injected clock.
CREATE TABLE IF NOT EXISTS "band_link" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
