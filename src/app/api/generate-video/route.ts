import { NextRequest, NextResponse } from 'next/server';
import { localUploadService } from '@/lib/upload-service';
import { getFullScriptWithSections, updateVideoScript } from '@/lib/db/videoScripts';
import { pexelsService } from '@/lib/pexels';
import { videoProcessor, VideoProcessor } from '@/lib/video-processor';
import { generateThumbnail } from '@/lib/generate-thumbnail';

export async function POST(request: NextRequest) {
    try {
        const { scriptId, quality = 'medium' } = await request.json();

        if (!scriptId) {
            return NextResponse.json(
                { error: 'Script ID is required' },
                { status: 400 }
            );
        }

        // Check if required services are configured
        if (!process.env.PEXELS_API_KEY) {
            return NextResponse.json(
                { error: 'Pexels API key not configured' },
                { status: 500 }
            );
        }

        // Get the script and its sections
        const { script, sections } = await getFullScriptWithSections(scriptId);

        if (!script) {
            return NextResponse.json(
                { error: 'Script not found' },
                { status: 404 }
            );
        }

        if (!script.audioUrl) {
            return NextResponse.json(
                { error: 'Script does not have audio. Please generate audio first.' },
                { status: 400 }
            );
        }

        if (!sections || sections.length === 0) {
            return NextResponse.json(
                { error: 'No script sections found' },
                { status: 400 }
            );
        }

        console.log(`🎬 Starting video generation for script ${scriptId}...`);

        // Step 1: Get audio duration
        console.log('📏 Getting audio duration...');
        const audioDuration = await videoProcessor.getAudioDuration(script.audioUrl);

        if (!audioDuration || audioDuration <= 0) {
            return NextResponse.json(
                { error: 'Invalid audio duration' },
                { status: 400 }
            );
        }

        console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)}s`);

        // Step 2: Find relevant videos
        console.log('🔍 Finding relevant videos...');
        const selectedVideos = await pexelsService.findVideosForScript(
            sections.map(section => ({
                title: section.title,
                content: section.content,
                estimatedDuration: section.estimatedDuration || '30 seconds'
            })),
            audioDuration
        );

        if (!selectedVideos || selectedVideos.length === 0) {
            return NextResponse.json(
                { error: 'No relevant videos found' },
                { status: 404 }
            );
        }

        console.log(`📹 Found ${selectedVideos.length} relevant videos`);

        // Calculate total available video duration
        const totalVideoDuration = selectedVideos.reduce((sum: number, video: any) => sum + video.duration, 0);
        console.log(`📊 Total video duration: ${totalVideoDuration}s`);

        // More forgiving fallback validation
        if (totalVideoDuration < audioDuration * 0.6) { // Reduced from 0.8 to 0.6 (60% minimum)
            return NextResponse.json(
                {
                    error: 'Insufficient video content found',
                    details: `Found ${totalVideoDuration}s of video for ${audioDuration}s of audio. Need at least ${(audioDuration * 0.6).toFixed(1)}s for basic video generation.`,
                    suggestion: 'Try using a shorter script, different keywords, or the system will loop available clips to fill the duration.'
                },
                { status: 400 }
            );
        }

        // Step 3: Prepare video segments
        console.log('🎞️ Preparing video segments...');
        const videoSegments = await videoProcessor.prepareVideoSegments(
            selectedVideos,
            audioDuration
        );

        if (videoSegments.length === 0) {
            return NextResponse.json(
                { error: 'Failed to prepare video segments' },
                { status: 500 }
            );
        }

        // Step 4: Create final video
        console.log('🎬 Creating final video...');
        const processingOptions = VideoProcessor.getDefaultOptions(audioDuration);
        processingOptions.quality = quality as 'low' | 'medium' | 'high';

        const videoBuffer = await videoProcessor.createVideo(
            videoSegments,
            script.audioUrl,
            processingOptions
        );

        // Step 5: Upload video to local storage
        console.log('📤 Uploading video to local storage...');
        console.log(`Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        const uploadResult = await localUploadService.uploadVideo(videoBuffer, {
            folder: 'script-videos',
            public_id: `script-video-${scriptId}-${Date.now()}`,
            tags: ['script-video', `script-${scriptId}`, quality],
            quality: 'auto'
        });

        // Step 6: Update the script with video URL
        await updateVideoScript(scriptId, {
            videoUrl: uploadResult.secure_url
        });

        // Step 7: Generate thumbnail using the script title
        let thumbnailPath: string | undefined = undefined;
        if (script.title) {
            thumbnailPath = await generateThumbnail(script.title);
            // Update the script with the thumbnail path
            await updateVideoScript(scriptId, {
                thumbnailPath
            });
        }

        console.log(`✅ Video generation completed successfully using local storage`);

        return NextResponse.json({
            success: true,
            videoUrl: uploadResult.secure_url,
            thumbnailPath,
            message: 'Video generated successfully',
            metadata: {
                scriptId,
                audioDuration: audioDuration.toFixed(2),
                videoSegments: videoSegments.length,
                quality,
                storageType: 'local',
                localPath: uploadResult.local_path,
                videoSizeMB: (videoBuffer.length / 1024 / 1024).toFixed(2)
            }
        });

    } catch (error) {
        console.error('Video generation error:', error);
        return NextResponse.json(
            {
                error: 'Video generation failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 