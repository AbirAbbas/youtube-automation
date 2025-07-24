import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const videoIdeas = pgTable('video_ideas', {
    id: serial('id').primaryKey(),
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
    audioUrl: varchar('audio_url', { length: 500 }), // Cloudinary URL for generated audio
    videoUrl: varchar('video_url', { length: 500 }), // Cloudinary URL for generated video
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

export type VideoIdea = typeof videoIdeas.$inferSelect;
export type NewVideoIdea = typeof videoIdeas.$inferInsert;

export type VideoScript = typeof videoScripts.$inferSelect;
export type NewVideoScript = typeof videoScripts.$inferInsert;

export type ScriptSection = typeof scriptSections.$inferSelect;
export type NewScriptSection = typeof scriptSections.$inferInsert; 