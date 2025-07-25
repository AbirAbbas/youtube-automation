CREATE TABLE "youtube_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"avatar_url" varchar(500),
	"channel_url" varchar(500),
	"subscriber_count" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_ideas" ADD COLUMN "channel_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "video_ideas" ADD CONSTRAINT "video_ideas_channel_id_youtube_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."youtube_channels"("id") ON DELETE no action ON UPDATE no action;