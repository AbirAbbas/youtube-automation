import { NextRequest, NextResponse } from 'next/server';
import { getFullScriptWithSections } from '@/lib/db/videoScripts';
import { getYoutubeChannelById } from '@/lib/db/youtubeChannels';
import { aiContentGenerator } from '@/lib/ai-content-generator';
import { youtubeUploadService } from '@/lib/youtube-upload';
import { videoScheduler } from '@/lib/video-scheduler';
import { videoArchiver } from '@/lib/video-archiver';
import { archiveConfigManager } from '@/lib/archive-config';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
    try {
        const { scriptId, channelId } = await request.json();

        if (!scriptId || !channelId) {
            return NextResponse.json(
                { error: 'Script ID and Channel ID are required' },
                { status: 400 }
            );
        }

        // Get the script and verify it has a video
        const { script, sections } = await getFullScriptWithSections(scriptId);
        if (!script) {
            return NextResponse.json(
                { error: 'Script not found' },
                { status: 404 }
            );
        }

        if (!script.videoUrl) {
            return NextResponse.json(
                { error: 'Script does not have a generated video. Please generate video first.' },
                { status: 400 }
            );
        }

        // Ensure thumbnail exists - generate if missing
        let thumbnailPath = script.thumbnailPath;
        if (!thumbnailPath) {
            console.log('📸 Generating thumbnail for automated upload...');
            const { generateThumbnail } = await import('@/lib/generate-thumbnail');
            const { updateVideoScript } = await import('@/lib/db/videoScripts');

            thumbnailPath = await generateThumbnail(script.title);
            await updateVideoScript(scriptId, { thumbnailPath });
            console.log('✅ Thumbnail generated successfully');
        }

        // Verify channel exists and is authenticated
        const channel = await getYoutubeChannelById(channelId);
        if (!channel) {
            return NextResponse.json(
                { error: 'Channel not found' },
                { status: 404 }
            );
        }

        if (!channel.isAuthenticated) {
            return NextResponse.json(
                { error: 'Channel is not authenticated with YouTube' },
                { status: 400 }
            );
        }

        console.log(`🤖 Starting automated YouTube upload for script ${scriptId} to channel ${channel.name}`);

        // Use the original script title (from idea generation) instead of regenerating
        // const generatedTitle = await aiContentGenerator.generateVideoTitle(script, sections);
        const finalTitle = script.title; // Keep the original clickbait title
        const generatedContent = await aiContentGenerator.generateVideoContent(script, sections);

        console.log(`📝 Using original title: "${finalTitle}"`);

        // --- YouTube-based scheduling logic ---
        // Fetch scheduled videos from YouTube
        const scheduledVideos = await youtubeUploadService.getScheduledVideosFromYouTube(channelId);
        let baseDate: Date;
        if (scheduledVideos.length > 0) {
            // Use the latest publishAt date
            baseDate = new Date(scheduledVideos[0].publishAt);
            baseDate.setDate(baseDate.getDate() + 1);
            console.log(`📅 Found latest scheduled video on YouTube: ${scheduledVideos[0].publishAt}`);
            console.log(`📅 Base date (day after): ${baseDate.toLocaleString()}`);
        } else {
            // No scheduled videos, start from today
            baseDate = new Date();
            console.log(`📅 No scheduled videos on YouTube, starting from today: ${baseDate.toLocaleString()}`);
        }
        // Set to 7am EST (UTC-5, so 12pm UTC)
        const scheduledDate = new Date(baseDate);
        scheduledDate.setUTCHours(12, 0, 0, 0); // 7am EST = 12pm UTC
        // If the calculated time is in the past, move to the next day
        if (scheduledDate <= new Date()) {
            scheduledDate.setDate(scheduledDate.getDate() + 1);
            console.log(`📅 Calculated time was in the past, moved to next day: ${scheduledDate.toLocaleString()}`);
        }
        console.log(`📅 Final scheduled time (YouTube-based): ${scheduledDate.toLocaleString()}`);
        // --- End YouTube-based scheduling logic ---

        // Download video from Cloudinary to local temp file
        const tempDir = path.join(process.cwd(), 'temp', 'youtube-uploads');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempVideoPath = path.join(tempDir, `video-${scriptId}-${Date.now()}.mp4`);

        try {
            await youtubeUploadService.downloadVideoForUpload(script.videoUrl, tempVideoPath);

            // Upload to YouTube with native scheduling
            const result = await youtubeUploadService.uploadVideo(
                channelId,
                tempVideoPath,
                {
                    title: finalTitle,
                    description: generatedContent.description,
                    tags: generatedContent.tags,
                    privacyStatus: 'private', // Start as private, will be published at scheduled time
                    publishAt: scheduledDate,
                    thumbnail: thumbnailPath // Always pass thumbnail (generated if missing)
                }
            );

            // Clean up temp file
            try {
                fs.unlinkSync(tempVideoPath);
            } catch (cleanupError) {
                console.warn('Failed to clean up temp file:', cleanupError);
            }

            console.log(`✅ Video uploaded and scheduled for: ${scheduledDate.toLocaleString()}`);

            // Automatically archive the video after successful upload
            const config = archiveConfigManager.getConfig();

            if (config.autoArchive) {
                try {
                    // Add delay if configured
                    if (config.archiveDelayMinutes > 0) {
                        console.log(`⏳ Waiting ${config.archiveDelayMinutes} minutes before archiving...`);
                        await new Promise(resolve => setTimeout(resolve, config.archiveDelayMinutes * 60 * 1000));
                    }

                    await videoArchiver.archiveScriptDirectly(scriptId, {
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

            return NextResponse.json({
                success: true,
                message: 'Video uploaded to YouTube with native scheduling',
                scheduledFor: scheduledDate,
                status: 'uploaded',
                videoId: result.videoId,
                videoUrl: result.videoUrl,
                generatedContent: {
                    title: finalTitle,
                    description: generatedContent.description,
                    tags: generatedContent.tags
                }
            });

        } catch (uploadError) {
            // Clean up temp file on error
            try {
                if (fs.existsSync(tempVideoPath)) {
                    fs.unlinkSync(tempVideoPath);
                }
            } catch (cleanupError) {
                console.warn('Failed to clean up temp file after error:', cleanupError);
            }
            throw uploadError;
        }

    } catch (error) {
        console.error('Automated YouTube upload API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to schedule video for automated upload' },
            { status: 500 }
        );
    }
} 