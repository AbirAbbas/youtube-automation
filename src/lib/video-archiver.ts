import { db } from './db';
import { videoScripts, scheduledVideos } from './db/schema';
import { eq } from 'drizzle-orm';
import { getFullScriptWithSections, updateVideoScript } from './db/videoScripts';

export interface ArchiveOptions {
    archiveScript?: boolean; // Archive the video script
    archiveFiles?: boolean; // Archive generated files (audio, video, thumbnail)
    keepMetadata?: boolean; // Keep metadata for future reference
}

export class VideoArchiver {
    /**
     * Archive a video after successful YouTube upload
     */
    async archiveVideo(
        scheduledVideoId: number,
        options: ArchiveOptions = {}
    ): Promise<void> {
        try {
            console.log(`📦 Starting video archiving for scheduled video ID: ${scheduledVideoId}`);

            // Get the scheduled video details
            const scheduledVideo = await this.getScheduledVideo(scheduledVideoId);
            if (!scheduledVideo) {
                throw new Error('Scheduled video not found');
            }

            if (scheduledVideo.status !== 'uploaded') {
                console.log(`⚠️ Video not uploaded yet (status: ${scheduledVideo.status}), skipping archiving`);
                return;
            }

            // Get the full script with sections
            const { script } = await getFullScriptWithSections(scheduledVideo.scriptId);
            if (!script) {
                throw new Error('Video script not found');
            }

            console.log(`📦 Archiving video: ${script.title}`);

            // Archive the video script
            if (options.archiveScript !== false) {
                await this.archiveVideoScript(script.id);
            }

            // Archive generated files if requested
            if (options.archiveFiles !== false) {
                await this.archiveGeneratedFiles(script);
            }

            // Update scheduled video with archiving info
            await this.updateScheduledVideoArchiveStatus(scheduledVideoId, true);

            console.log(`✅ Successfully archived video: ${script.title}`);

        } catch (error) {
            console.error('Error archiving video:', error);
            throw new Error(`Failed to archive video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Archive a video script
     */
    private async archiveVideoScript(scriptId: number): Promise<void> {
        try {
            await updateVideoScript(scriptId, {
                isArchived: true,
                updatedAt: new Date()
            });

            console.log(`📦 Archived video script ID: ${scriptId}`);
        } catch (error) {
            console.error('Error archiving video script:', error);
            throw error;
        }
    }

    /**
     * Archive generated files (audio, video, thumbnail)
     */
    private async archiveGeneratedFiles(script: any): Promise<void> {
        try {
            // For now, we'll just log the files that would be archived
            // In a production environment, you might want to:
            // 1. Move files to a long-term storage (like AWS S3 Glacier)
            // 2. Delete local files to free up space
            // 3. Update file URLs to point to archived locations

            const filesToArchive = [];

            if (script.audioUrl) {
                filesToArchive.push({ type: 'audio', url: script.audioUrl });
            }

            if (script.videoUrl) {
                filesToArchive.push({ type: 'video', url: script.videoUrl });
            }

            if (script.thumbnailPath) {
                filesToArchive.push({ type: 'thumbnail', path: script.thumbnailPath });
            }

            if (filesToArchive.length > 0) {
                console.log(`📦 Files marked for archiving:`, filesToArchive);

                // TODO: Implement actual file archiving logic
                // This could involve:
                // - Moving files to cold storage
                // - Updating URLs in the database
                // - Cleaning up local storage

                console.log(`📦 Note: File archiving is currently logged only. Implement actual archiving logic as needed.`);
            }

        } catch (error) {
            console.error('Error archiving generated files:', error);
            // Don't throw error here as file archiving is optional
        }
    }

    /**
     * Get scheduled video by ID
     */
    private async getScheduledVideo(scheduledVideoId: number): Promise<any> {
        try {
            const result = await db
                .select()
                .from(scheduledVideos)
                .where(eq(scheduledVideos.id, scheduledVideoId))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            console.error('Error getting scheduled video:', error);
            throw error;
        }
    }

    /**
     * Update scheduled video with archiving status
     */
    private async updateScheduledVideoArchiveStatus(scheduledVideoId: number, isArchived: boolean): Promise<void> {
        try {
            await db
                .update(scheduledVideos)
                .set({
                    updatedAt: new Date()
                })
                .where(eq(scheduledVideos.id, scheduledVideoId));

            console.log(`📦 Updated scheduled video ${scheduledVideoId} archiving status`);
        } catch (error) {
            console.error('Error updating scheduled video archiving status:', error);
            throw error;
        }
    }

    /**
     * Get archived videos for a channel
     */
    async getArchivedVideos(channelId: number): Promise<any[]> {
        try {
            return await db
                .select({
                    scheduledVideo: scheduledVideos,
                    script: videoScripts
                })
                .from(scheduledVideos)
                .innerJoin(videoScripts, eq(scheduledVideos.scriptId, videoScripts.id))
                .where(eq(scheduledVideos.channelId, channelId))
                .where(eq(videoScripts.isArchived, true))
                .orderBy(scheduledVideos.updatedAt);
        } catch (error) {
            console.error('Error getting archived videos:', error);
            throw new Error(`Failed to get archived videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Restore an archived video (unarchive)
     */
    async restoreVideo(scriptId: number): Promise<void> {
        try {
            await updateVideoScript(scriptId, {
                isArchived: false,
                updatedAt: new Date()
            });

            console.log(`📦 Restored video script ID: ${scriptId}`);
        } catch (error) {
            console.error('Error restoring video:', error);
            throw new Error(`Failed to restore video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Archive a video script directly (for direct uploads)
     */
    async archiveScriptDirectly(scriptId: number, options: ArchiveOptions = {}): Promise<void> {
        try {
            console.log(`📦 Starting direct script archiving for script ID: ${scriptId}`);

            // Get the full script with sections
            const { script } = await getFullScriptWithSections(scriptId);
            if (!script) {
                throw new Error('Video script not found');
            }

            console.log(`📦 Archiving video: ${script.title}`);

            // Archive the video script
            if (options.archiveScript !== false) {
                await this.archiveVideoScript(script.id);
            }

            // Archive generated files if requested
            if (options.archiveFiles !== false) {
                await this.archiveGeneratedFiles(script);
            }

            console.log(`✅ Successfully archived video: ${script.title}`);

        } catch (error) {
            console.error('Error archiving video script directly:', error);
            throw new Error(`Failed to archive video script: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Bulk archive videos for a channel
     */
    async bulkArchiveChannelVideos(channelId: number, options: ArchiveOptions = {}): Promise<number> {
        try {
            console.log(`📦 Starting bulk archiving for channel ID: ${channelId}`);

            // Get all uploaded videos for the channel
            const uploadedVideos = await db
                .select()
                .from(scheduledVideos)
                .where(eq(scheduledVideos.channelId, channelId))
                .where(eq(scheduledVideos.status, 'uploaded'));

            let archivedCount = 0;

            for (const video of uploadedVideos) {
                try {
                    await this.archiveVideo(video.id, options);
                    archivedCount++;
                } catch (error) {
                    console.error(`Error archiving video ${video.id}:`, error);
                    // Continue with other videos
                }
            }

            console.log(`✅ Bulk archiving completed. Archived ${archivedCount} videos.`);
            return archivedCount;

        } catch (error) {
            console.error('Error in bulk archiving:', error);
            throw new Error(`Failed to bulk archive videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const videoArchiver = new VideoArchiver(); 