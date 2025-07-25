ALTER TABLE "youtube_channels" ADD COLUMN "youtube_channel_id" varchar(255);--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "is_authenticated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_channels" ADD COLUMN "last_upload_at" timestamp;