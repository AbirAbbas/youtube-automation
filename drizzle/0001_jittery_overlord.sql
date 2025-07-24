CREATE TABLE "script_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"section_type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"order_index" integer NOT NULL,
	"estimated_duration" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_idea_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"estimated_length" varchar(50),
	"total_sections" integer NOT NULL,
	"status" varchar(50) DEFAULT 'generating' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "script_sections" ADD CONSTRAINT "script_sections_script_id_video_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."video_scripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_scripts" ADD CONSTRAINT "video_scripts_video_idea_id_video_ideas_id_fk" FOREIGN KEY ("video_idea_id") REFERENCES "public"."video_ideas"("id") ON DELETE no action ON UPDATE no action;