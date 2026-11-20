ALTER TABLE "celebrities" ADD COLUMN "segments" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- Until now `US-film` was the only segment, so it found every person in the table.
UPDATE "celebrities" SET "segments" = ARRAY['US-film'];
