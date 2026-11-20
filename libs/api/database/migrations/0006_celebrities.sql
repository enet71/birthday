CREATE TABLE "celebrities" (
	"id" text PRIMARY KEY NOT NULL,
	"birth_date" date NOT NULL,
	"birth_month" smallint NOT NULL,
	"birth_day" smallint NOT NULL,
	"death_date" date,
	"occupation" text,
	"countries" text[] NOT NULL,
	"names" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"wikipedia_titles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sitelinks" integer NOT NULL,
	"pageviews" integer,
	"details_loaded_at" timestamp with time zone,
	"pageviews_loaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "celebrities_birth_month_check" CHECK ("celebrities"."birth_month" between 1 and 12),
	CONSTRAINT "celebrities_birth_day_check" CHECK ("celebrities"."birth_day" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "celebrity_imports" (
	"segment" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"people" integer,
	"error" text
);
--> statement-breakpoint
CREATE INDEX "celebrities_birth_month_day_idx" ON "celebrities" USING btree ("birth_month","birth_day");