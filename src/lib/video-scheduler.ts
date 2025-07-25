import { db } from './db';
import { scheduledVideos } from './db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export interface ScheduleOptions {
    channelId: number;
    scriptId: number;
    title: string;
    description: string;
    tags: string[];
}

export class VideoScheduler {
    /**
     * Schedule a video for upload at the next available 7am EST slot
     */
    async scheduleVideo(options: ScheduleOptions): Promise<{ scheduledFor: Date; status: string }> {
        try {
            // Get the next available 7am EST slot
            const scheduledFor = await this.getNextAvailableSlot(options.channelId);

            // Insert the scheduled video
            await db.insert(scheduledVideos).values({
                scriptId: options.scriptId,
                channelId: options.channelId,
                title: options.title,
                description: options.description,
                tags: JSON.stringify(options.tags),
                scheduledFor: scheduledFor,
                status: 'scheduled'
            });

            return {
                scheduledFor,
                status: 'scheduled'
            };

        } catch (error) {
            console.error('Error scheduling video:', error);
            throw new Error(`Failed to schedule video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get the next available 7am EST slot
     */
    async getNextAvailableSlot(channelId: number): Promise<Date> {
        // Get the latest scheduled video for this channel
        const latestScheduled = await db
            .select()
            .from(scheduledVideos)
            .where(eq(scheduledVideos.channelId, channelId))
            .orderBy(desc(scheduledVideos.scheduledFor))
            .limit(1);

        let baseDate: Date;

        if (latestScheduled.length > 0) {
            // Start from the day after the latest scheduled video
            baseDate = new Date(latestScheduled[0].scheduledFor);
            baseDate.setDate(baseDate.getDate() + 1);
            console.log(`📅 Found latest scheduled video: ${latestScheduled[0].scheduledFor.toLocaleString()}`);
            console.log(`📅 Base date (day after): ${baseDate.toLocaleString()}`);
        } else {
            // No previous videos, start from today
            baseDate = new Date();
            console.log(`📅 No previous scheduled videos, starting from today: ${baseDate.toLocaleString()}`);
        }

        // Set to 7am EST (UTC-5, but we'll use UTC-4 for EDT)
        // For simplicity, we'll use UTC-5 (EST) year-round
        const scheduledDate = new Date(baseDate);
        scheduledDate.setUTCHours(12, 0, 0, 0); // 7am EST = 12pm UTC

        // If the calculated time is in the past, move to the next day
        if (scheduledDate <= new Date()) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
            console.log(`📅 Calculated time was in the past, moved to next day: ${scheduledDate.toLocaleString()}`);
        }

        console.log(`📅 Final scheduled time: ${scheduledDate.toLocaleString()}`);
        return scheduledDate;
    }

    /**
     * Get all scheduled videos for a channel
     */
    async getScheduledVideos(channelId: number): Promise<any[]> {
        try {
            return await db
                .select()
                .from(scheduledVideos)
                .where(eq(scheduledVideos.channelId, channelId))
                .orderBy(scheduledVideos.scheduledFor);
        } catch (error) {
            console.error('Error getting scheduled videos:', error);
            throw new Error(`Failed to get scheduled videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get videos that are ready to be uploaded (scheduled time has passed)
     */
    async getReadyToUploadVideos(): Promise<any[]> {
        try {
            const now = new Date();

            return await db
                .select()
                .from(scheduledVideos)
                .where(
                    and(
                        eq(scheduledVideos.status, 'scheduled'),
                        gte(now, scheduledVideos.scheduledFor)
                    )
                )
                .orderBy(scheduledVideos.scheduledFor);
        } catch (error) {
            console.error('Error getting ready to upload videos:', error);
            throw new Error(`Failed to get ready to upload videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update video status after upload
     */
    async updateVideoStatus(
        scheduledVideoId: number,
        status: 'uploaded' | 'failed',
        youtubeVideoId?: string,
        youtubeVideoUrl?: string,
        error?: string
    ): Promise<void> {
        try {
            await db
                .update(scheduledVideos)
                .set({
                    status,
                    youtubeVideoId,
                    youtubeVideoUrl,
                    uploadError: error,
                    updatedAt: new Date()
                })
                .where(eq(scheduledVideos.id, scheduledVideoId));
        } catch (error) {
            console.error('Error updating video status:', error);
            throw new Error(`Failed to update video status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a scheduled video
     */
    async deleteScheduledVideo(scheduledVideoId: number): Promise<void> {
        try {
            await db
                .delete(scheduledVideos)
                .where(eq(scheduledVideos.id, scheduledVideoId));
        } catch (error) {
            console.error('Error deleting scheduled video:', error);
            throw new Error(`Failed to delete scheduled video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const videoScheduler = new VideoScheduler(); 