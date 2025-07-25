import { videoScheduler } from './video-scheduler';
import { youtubeUploadService } from './youtube-upload';
import { videoArchiver } from './video-archiver';
import { archiveConfigManager } from './archive-config';
import { getFullScriptWithSections } from './db/videoScripts';
import { getYoutubeChannelById } from './db/youtubeChannels';
import path from 'path';
import fs from 'fs';

export class UploadProcessor {
    /**
     * Process all videos that are ready to be uploaded
     */
    async processScheduledUploads(): Promise<void> {
        try {
            console.log('🔄 Starting scheduled upload processor...');

            const readyVideos = await videoScheduler.getReadyToUploadVideos();

            if (readyVideos.length === 0) {
                console.log('✅ No videos ready for upload');
                return;
            }

            console.log(`📤 Found ${readyVideos.length} videos ready for upload`);

            for (const scheduledVideo of readyVideos) {
                await this.processVideo(scheduledVideo);
            }

        } catch (error) {
            console.error('Error processing scheduled uploads:', error);
        }
    }

    /**
     * Process a single scheduled video
     */
    private async processVideo(scheduledVideo: any): Promise<void> {
        try {
            console.log(`🎬 Processing video: ${scheduledVideo.title}`);

            // Get script and channel details
            const { script } = await getFullScriptWithSections(scheduledVideo.scriptId);
            const channel = await getYoutubeChannelById(scheduledVideo.channelId);

            if (!script || !channel) {
                await videoScheduler.updateVideoStatus(
                    scheduledVideo.id,
                    'failed',
                    undefined,
                    undefined,
                    'Script or channel not found'
                );
                return;
            }

            // Ensure thumbnail exists - generate if missing
            let thumbnailPath = script.thumbnailPath;
            if (!thumbnailPath) {
                console.log('📸 Generating thumbnail for scheduled upload...');
                const { generateThumbnail } = await import('@/lib/generate-thumbnail');
                const { updateVideoScript } = await import('@/lib/db/videoScripts');

                thumbnailPath = await generateThumbnail(script.title);
                await updateVideoScript(scheduledVideo.scriptId, { thumbnailPath });
                console.log('✅ Thumbnail generated successfully');
            }

            // Download video from URL to local temp file
            const tempDir = path.join(process.cwd(), 'temp', 'youtube-uploads');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempVideoPath = path.join(tempDir, `video-${scheduledVideo.scriptId}-${Date.now()}.mp4`);

            try {
                await youtubeUploadService.downloadVideoForUpload(script.videoUrl, tempVideoPath);

                // Parse tags from JSON string
                const tags = JSON.parse(scheduledVideo.tags || '[]');

                // Prepare upload options
                const uploadOptions = {
                    title: scheduledVideo.title,
                    description: scheduledVideo.description,
                    tags: tags,
                    privacyStatus: 'public' as 'private' | 'public' | 'unlisted',
                    thumbnail: thumbnailPath // Always pass thumbnail (generated if missing)
                };

                // Upload to YouTube
                const result = await youtubeUploadService.uploadVideo(
                    scheduledVideo.channelId,
                    tempVideoPath,
                    uploadOptions
                );

                // Update status to uploaded
                await videoScheduler.updateVideoStatus(
                    scheduledVideo.id,
                    'uploaded',
                    result.videoId,
                    result.videoUrl
                );

                console.log(`✅ Successfully uploaded: ${result.videoUrl}`);

                // Automatically archive the video after successful upload
                const config = archiveConfigManager.getConfig();

                if (config.autoArchive) {
                    try {
                        // Add delay if configured
                        if (config.archiveDelayMinutes > 0) {
                            console.log(`⏳ Waiting ${config.archiveDelayMinutes} minutes before archiving...`);
                            await new Promise(resolve => setTimeout(resolve, config.archiveDelayMinutes * 60 * 1000));
                        }

                        await videoArchiver.archiveVideo(scheduledVideo.id, {
                            archiveScript: config.archiveScript,
                            archiveFiles: config.archiveFiles,
                            keepMetadata: config.keepMetadata
                        });
                        console.log(`📦 Video automatically archived after successful upload`);
                    } catch (archiveError) {
                        console.warn('Failed to archive video after upload:', archiveError);
                        // Don't fail the upload process if archiving fails
                    }
                } else {
                    console.log(`📦 Auto-archiving is disabled, video not archived`);
                }

                // Clean up temp file
                try {
                    fs.unlinkSync(tempVideoPath);
                } catch (cleanupError) {
                    console.warn('Failed to clean up temp file:', cleanupError);
                }

            } catch (uploadError) {
                // Clean up temp file on error
                try {
                    if (fs.existsSync(tempVideoPath)) {
                        fs.unlinkSync(tempVideoPath);
                    }
                } catch (cleanupError) {
                    console.warn('Failed to clean up temp file after error:', cleanupError);
                }

                // Update status to failed
                await videoScheduler.updateVideoStatus(
                    scheduledVideo.id,
                    'failed',
                    undefined,
                    undefined,
                    uploadError instanceof Error ? uploadError.message : 'Upload failed'
                );

                console.error(`❌ Failed to upload video: ${uploadError}`);
            }

        } catch (error) {
            console.error('Error processing video:', error);

            // Update status to failed
            await videoScheduler.updateVideoStatus(
                scheduledVideo.id,
                'failed',
                undefined,
                undefined,
                error instanceof Error ? error.message : 'Processing failed'
            );
        }
    }

    /**
     * Start the upload processor (to be called periodically)
     */
    async start(): Promise<void> {
        console.log('🚀 Starting upload processor...');

        // Process uploads immediately
        await this.processScheduledUploads();

        // Set up periodic processing (every 5 minutes)
        setInterval(async () => {
            await this.processScheduledUploads();
        }, 5 * 60 * 1000);
    }
}

export const uploadProcessor = new UploadProcessor(); 