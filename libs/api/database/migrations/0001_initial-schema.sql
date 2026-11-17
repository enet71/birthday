CREATE TABLE "birthdays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"relationship" text,
	"notes" text,
	"google_contact_id" text,
	"google_contact_snapshot" text,
	"google_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birthdays_name_check" CHECK (length(trim("birthdays"."name")) between 1 and 200),
	CONSTRAINT "birthdays_relationship_check" CHECK ("birthdays"."relationship" in ('family', 'friends', 'colleagues', 'other')),
	CONSTRAINT "birthdays_notes_check" CHECK (length("birthdays"."notes") <= 500)
);
--> statement-breakpoint
CREATE TABLE "google_calendar_connections" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_pulled_at" timestamp with time zone DEFAULT '-infinity' NOT NULL,
	"sync_running_until" timestamp with time zone DEFAULT '-infinity' NOT NULL,
	"deletions_checked_at" timestamp with time zone DEFAULT '-infinity' NOT NULL,
	CONSTRAINT "google_calendar_connections_status_check" CHECK ("google_calendar_connections"."status" in ('connected', 'revoked', 'disconnected'))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"user_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	CONSTRAINT "notification_deliveries_user_id_local_date_pk" PRIMARY KEY("user_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"remind_on_day" boolean DEFAULT true NOT NULL,
	"remind_day_before" boolean DEFAULT true NOT NULL,
	"hour" smallint DEFAULT 9 NOT NULL,
	"time_zone" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	CONSTRAINT "notification_settings_hour_check" CHECK ("notification_settings"."hour" between 0 and 23),
	CONSTRAINT "notification_settings_time_zone_check" CHECK (public.is_valid_time_zone("notification_settings"."time_zone")),
	CONSTRAINT "notification_settings_check" CHECK ("notification_settings"."remind_on_day" or "notification_settings"."remind_day_before"),
	CONSTRAINT "notification_settings_locale_check" CHECK ("notification_settings"."locale" in ('en', 'es', 'de', 'fr', 'ru', 'uk'))
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE("user_id","endpoint"),
	CONSTRAINT "push_subscriptions_endpoint_check" CHECK (length("push_subscriptions"."endpoint") <= 2048 and "push_subscriptions"."endpoint" ~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)/'),
	CONSTRAINT "push_subscriptions_p256dh_check" CHECK (length("push_subscriptions"."p256dh") between 1 and 256),
	CONSTRAINT "push_subscriptions_auth_check" CHECK (length("push_subscriptions"."auth") between 1 and 256)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "birthdays" ADD CONSTRAINT "birthdays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "birthdays_user_id_idx" ON "birthdays" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "birthdays_user_id_google_contact_id_idx" ON "birthdays" USING btree ("user_id","google_contact_id");--> statement-breakpoint
CREATE INDEX "birthdays_google_event_id_idx" ON "birthdays" USING btree ("google_event_id") WHERE "birthdays"."google_event_id" is not null;