import { NextRequest, NextResponse } from 'next/server';
import { hybridUploadService } from '@/lib/upload-service';
import { getFullScriptWithSections, updateVideoScript } from '@/lib/db/videoScripts';
import { pexelsService } from '@/lib/pexels';
import { videoProcessor, VideoProcessor } from '@/lib/video-processor';

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

        // Check if any upload service is available (Cloudinary or local storage)
        const storageStats = await hybridUploadService.getStorageStats();
        if (!storageStats.cloudinary.configured) {
            console.log('⚠️ Cloudinary not configured, will use local storage fallback');
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
        console.log(`Audio duration: ${audioDuration} seconds`);

        // Step 2: Find relevant stock videos
        console.log('🔍 Searching for relevant stock videos...');
        const selectedVideos = await pexelsService.findVideosForScript(
            sections.map(section => ({
                title: section.title,
                content: section.content,
                estimatedDuration: section.estimatedDuration || '30 seconds'
            })),
            audioDuration
        );

        if (selectedVideos.length === 0) {
            return NextResponse.json(
                { error: 'Could not find suitable stock videos' },
                { status: 400 }
            );
        }

        const totalVideoDuration = selectedVideos.reduce((sum, v) => sum + v.duration, 0);
        console.log(`Found ${selectedVideos.length} videos with total duration: ${totalVideoDuration} seconds`);

        // Enhanced validation with better coverage requirements
        const coverageRatio = totalVideoDuration / audioDuration;
        const minimumCoverageRatio = 1.2; // Need 120% coverage for smooth playback

        if (coverageRatio < minimumCoverageRatio) {
            return NextResponse.json(
                {
                    error: 'Insufficient video content found',
                    details: `Found ${totalVideoDuration}s of video for ${audioDuration}s of audio (${coverageRatio.toFixed(2)}x coverage). Need at least ${minimumCoverageRatio}x coverage (${(audioDuration * minimumCoverageRatio).toFixed(1)}s) for smooth playback without excessive looping.`,
                    suggestion: 'Try using a shorter script, different keywords, or the system will need to loop clips which may cause repetitive content.',
                    metadata: {
                        videosFound: selectedVideos.length,
                        totalVideoDuration,
                        audioDuration,
                        coverageRatio: coverageRatio.toFixed(2),
                        requiredCoverage: minimumCoverageRatio,
                        shortfall: (audioDuration * minimumCoverageRatio - totalVideoDuration).toFixed(1)
                    }
                },
                { status: 400 }
            );
        }

        // Check for potential quality issues with very short clips
        const shortClips = selectedVideos.filter(v => v.duration < 5);
        if (shortClips.length > selectedVideos.length * 0.3) { // Reduced threshold from 50% to 30%
            console.warn(`⚠️ Warning: ${shortClips.length}/${selectedVideos.length} clips are shorter than 5 seconds. This may reduce video quality.`);
        }

        console.log(`✅ Good coverage ratio: ${coverageRatio.toFixed(2)}x (${totalVideoDuration}s for ${audioDuration}s audio)`);

        // Validate we have sufficient video content
        if (totalVideoDuration < audioDuration * 0.8) {
            return NextResponse.json(
                {
                    error: 'Insufficient video content found',
                    details: `Found ${totalVideoDuration}s of video for ${audioDuration}s of audio. Need at least ${(audioDuration * 0.8).toFixed(1)}s.`,
                    suggestion: 'Try using a shorter script or the system will loop shorter clips to fill the duration.'
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

        // Step 5: Upload video with hybrid service (Cloudinary first, local fallback)
        console.log('📤 Uploading video...');
        console.log(`Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        const uploadResult = await hybridUploadService.uploadVideo(videoBuffer, {
            folder: 'script-videos',
            public_id: `script-video-${scriptId}-${Date.now()}`,
            tags: ['script-video', `script-${scriptId}`, quality],
            quality: 'auto'
        });

        // Step 6: Update the script with video URL
        await updateVideoScript(scriptId, {
            videoUrl: uploadResult.secure_url
        });

        console.log(`✅ Video generation completed successfully using ${uploadResult.storage_type} storage`);

        return NextResponse.json({
            success: true,
            videoUrl: uploadResult.secure_url,
            message: 'Video generated successfully',
            storageType: uploadResult.storage_type,
            metadata: {
                scriptId,
                audioDuration,
                videosUsed: selectedVideos.length,
                videoSegments: videoSegments.length,
                quality,
                resolution: `${processingOptions.outputWidth}x${processingOptions.outputHeight}`,
                fps: processingOptions.fps,
                videoUrl: uploadResult.secure_url,
                storageType: uploadResult.storage_type,
                fileSize: `${(uploadResult.bytes / 1024 / 1024).toFixed(2)}MB`,
                videosMetadata: selectedVideos.map(v => ({
                    id: v.id,
                    duration: v.duration,
                    quality: v.quality,
                    tags: v.tags.slice(0, 3) // First 3 tags only for brevity
                }))
            }
        });

    } catch (error) {
        console.error('❌ Error generating video:', error);

        // Return more specific error information
        let errorMessage = 'Failed to generate video';
        let errorDetails = 'Unknown error';

        if (error instanceof Error) {
            errorDetails = error.message;

            // Categorize common errors
            if (error.message.includes('Pexels')) {
                errorMessage = 'Failed to find stock videos';
            } else if (error.message.includes('FFmpeg') || error.message.includes('video processing')) {
                errorMessage = 'Video processing failed';
            } else if (error.message.includes('Cloudinary') || error.message.includes('upload')) {
                errorMessage = 'Failed to upload video';
            } else if (error.message.includes('audio duration')) {
                errorMessage = 'Failed to analyze audio';
            }
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: errorDetails,
                troubleshooting: {
                    checkPexelsApiKey: 'Ensure PEXELS_API_KEY is set in environment variables',
                    checkStorage: 'If Cloudinary fails, local storage will be used as fallback',
                    checkCloudinary: 'For cloud storage, ensure CLOUDINARY_URL is properly configured',
                    checkFFmpeg: 'Ensure FFmpeg is installed on the system',
                    checkAudio: 'Ensure the script has a valid audio URL',
                    checkLocalStorage: 'Ensure the application has write permissions for local file storage'
                }
            },
            { status: 500 }
        );
    }
} 