CREATE TABLE "scheduled_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"channel_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"tags" text,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"youtube_video_id" varchar(255),
	"youtube_video_url" varchar(500),
	"upload_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_videos" ADD CONSTRAINT "scheduled_videos_script_id_video_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."video_scripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_videos" ADD CONSTRAINT "scheduled_videos_channel_id_youtube_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."youtube_channels"("id") ON DELETE no action ON UPDATE no action;