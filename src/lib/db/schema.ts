import { pgTable, serial, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const youtubeChannels = pgTable('youtube_channels', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    channelUrl: varchar('channel_url', { length: 500 }),
    subscriberCount: integer('subscriber_count'),
    // YouTube API OAuth fields
    youtubeChannelId: varchar('youtube_channel_id', { length: 255 }), // Actual YouTube channel ID
    accessToken: text('access_token'), // OAuth access token (encrypted)
    refreshToken: text('refresh_token'), // OAuth refresh token (encrypted)
    tokenExpiresAt: timestamp('token_expires_at'), // When the access token expires
    isAuthenticated: boolean('is_authenticated').notNull().default(false), // Whether channel is connected to YouTube
    lastUploadAt: timestamp('last_upload_at'), // Track last successful upload
    // Existing fields
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const videoIdeas = pgTable('video_ideas', {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id').references(() => youtubeChannels.id).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    estimatedLength: varchar('estimated_length', { length: 50 }),
    topic: varchar('topic', { length: 255 }),
    category: varchar('category', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, converted_to_script
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const videoScripts = pgTable('video_scripts', {
    id: serial('id').primaryKey(),
    videoIdeaId: integer('video_idea_id').references(() => videoIdeas.id).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    estimatedLength: varchar('estimated_length', { length: 50 }),
    totalSections: integer('total_sections').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('generating'), // generating, completed, failed
    isArchived: boolean('is_archived').notNull().default(false), // whether script is archived
    audioUrl: varchar('audio_url', { length: 500 }), // Local storage URL for generated audio
    videoUrl: varchar('video_url', { length: 500 }), // Local storage URL for generated video
    thumbnailPath: varchar('thumbnail_path', { length: 500 }), // Path to generated thumbnail image
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scriptSections = pgTable('script_sections', {
    id: serial('id').primaryKey(),
    scriptId: integer('script_id').references(() => videoScripts.id).notNull(),
    sectionType: varchar('section_type', { length: 100 }).notNull(), // intro, main_content_1, main_content_2, conclusion, etc.
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    orderIndex: integer('order_index').notNull(),
    estimatedDuration: varchar('estimated_duration', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scheduledVideos = pgTable('scheduled_videos', {
    id: serial('id').primaryKey(),
    scriptId: integer('script_id').references(() => videoScripts.id).notNull(),
    channelId: integer('channel_id').references(() => youtubeChannels.id).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    tags: text('tags'), // JSON array as text
    scheduledFor: timestamp('scheduled_for').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('scheduled'), // scheduled, uploaded, failed
    youtubeVideoId: varchar('youtube_video_id', { length: 255 }),
    youtubeVideoUrl: varchar('youtube_video_url', { length: 500 }),
    uploadError: text('upload_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type VideoIdea = typeof videoIdeas.$inferSelect;
export type NewVideoIdea = typeof videoIdeas.$inferInsert;

export type VideoScript = typeof videoScripts.$inferSelect;
export type NewVideoScript = typeof videoScripts.$inferInsert;

export type ScriptSection = typeof scriptSections.$inferSelect;
export type NewScriptSection = typeof scriptSections.$inferInsert;

export type YoutubeChannel = typeof youtubeChannels.$inferSelect;
export type NewYoutubeChannel = typeof youtubeChannels.$inferInsert; 