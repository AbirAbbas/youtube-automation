import { NextRequest, NextResponse } from 'next/server';
import { youtubeUploadService } from '@/lib/youtube-upload';
import { getFullScriptWithSections } from '@/lib/db/videoScripts';
import { getYoutubeChannelById } from '@/lib/db/youtubeChannels';
import { videoArchiver } from '@/lib/video-archiver';
import { archiveConfigManager } from '@/lib/archive-config';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
    try {
        const {
            scriptId,
            channelId,
            title,
            description,
            tags,
            privacyStatus = 'private'
        } = await request.json();

        if (!scriptId || !channelId) {
            return NextResponse.json(
                { error: 'Script ID and Channel ID are required' },
                { status: 400 }
            );
        }

        // Get the script and verify it has a video
        const { script } = await getFullScriptWithSections(scriptId);
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
            console.log('📸 Generating thumbnail for upload...');
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

        console.log(`🎬 Starting YouTube upload for script ${scriptId} to channel ${channel.name}`);

        // Download video from Cloudinary to local temp file
        const tempDir = path.join(process.cwd(), 'temp', 'youtube-uploads');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempVideoPath = path.join(tempDir, `video-${scriptId}-${Date.now()}.mp4`);

        try {
            await youtubeUploadService.downloadVideoForUpload(script.videoUrl, tempVideoPath);

            // Prepare upload options
            const uploadOptions = {
                title: title || script.title,
                description: description || `${script.title}\n\nDiscover the latest insights and tips in this comprehensive guide. Don't forget to like, subscribe, and hit the notification bell for more content like this!`,
                tags: tags || ['education', 'tips', 'guide', 'howto', 'tutorial'],
                privacyStatus: privacyStatus as 'private' | 'public' | 'unlisted',
                thumbnail: thumbnailPath // Always pass thumbnail (generated if missing)
            };

            // Upload to YouTube
            const result = await youtubeUploadService.uploadVideo(
                channelId,
                tempVideoPath,
                uploadOptions
            );

            // Clean up temp file
            try {
                fs.unlinkSync(tempVideoPath);
            } catch (cleanupError) {
                console.warn('Failed to clean up temp file:', cleanupError);
            }

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
                message: 'Video uploaded to YouTube successfully',
                videoId: result.videoId,
                videoUrl: result.videoUrl,
                title: result.title,
                thumbnailUrl: result.thumbnailUrl
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
        console.error('YouTube upload API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to upload video to YouTube' },
            { status: 500 }
        );
    }
} 