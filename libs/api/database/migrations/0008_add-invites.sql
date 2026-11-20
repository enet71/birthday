CREATE TABLE "invite_links" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_links_token_unique" UNIQUE("token"),
	CONSTRAINT "invite_links_display_name_check" CHECK (length(trim("invite_links"."display_name")) between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "invite_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_submissions_name_check" CHECK (length(trim("invite_submissions"."name")) between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_submissions" ADD CONSTRAINT "invite_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invite_submissions_user_id_idx" ON "invite_submissions" USING btree ("user_id");