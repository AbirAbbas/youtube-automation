import { NextRequest, NextResponse } from 'next/server';
import { localUploadService } from '@/lib/upload-service';
import { getFullScriptWithSections, updateVideoScript } from '@/lib/db/videoScripts';
import { subtitleVideoProcessor, SubtitleVideoProcessor } from '@/lib/subtitle-video-processor';

export async function POST(request: NextRequest) {
    try {
        const { scriptId, quality = 'medium', backgroundColor = '#1a1a1a', fontSize = 64, customText } = await request.json();

        if (!scriptId) {
            return NextResponse.json(
                { error: 'Script ID is required' },
                { status: 400 }
            );
        }

        // Get the script and its sections
        const { script, sections, topic } = await getFullScriptWithSections(scriptId);

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

        console.log(`🎬 Starting subtitle video generation for script ${scriptId}...`);

        // Step 1: Get audio duration
        console.log('📏 Getting audio duration...');
        const audioDuration = await subtitleVideoProcessor.getAudioDuration(script.audioUrl);

        if (!audioDuration || audioDuration <= 0) {
            return NextResponse.json(
                { error: 'Invalid audio duration' },
                { status: 400 }
            );
        }

        console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)}s`);

        // Step 2: Create subtitle video
        console.log('🎬 Creating subtitle video...');
        const processingOptions = SubtitleVideoProcessor.getDefaultOptions(audioDuration);
        processingOptions.quality = quality as 'low' | 'medium' | 'high';
        processingOptions.backgroundColor = backgroundColor;
        processingOptions.fontSize = fontSize;

        const videoBuffer = await subtitleVideoProcessor.createSubtitleVideo(
            sections,
            script.audioUrl,
            processingOptions,
            customText
        );

        // Step 3: Upload video to local storage
        console.log('📤 Uploading subtitle video to local storage...');
        console.log(`Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        const uploadResult = await localUploadService.uploadVideo(videoBuffer, {
            folder: 'subtitle-videos',
            public_id: `subtitle-video-${scriptId}-${Date.now()}`,
            tags: ['subtitle-video', `script-${scriptId}`, quality],
            quality: 'auto'
        });

        // Step 4: Update the script with video URL
        await updateVideoScript(scriptId, {
            videoUrl: uploadResult.secure_url
        });

        console.log(`✅ Subtitle video generation completed successfully using local storage`);

        return NextResponse.json({
            success: true,
            videoUrl: uploadResult.secure_url,
            message: 'Subtitle video generated successfully',
            metadata: {
                scriptId,
                audioDuration: audioDuration.toFixed(2),
                sections: sections.length,
                quality,
                backgroundColor,
                fontSize,
                storageType: 'local',
                localPath: uploadResult.local_path,
                videoSizeMB: (videoBuffer.length / 1024 / 1024).toFixed(2)
            }
        });

    } catch (error) {
        console.error('Subtitle video generation error:', error);
        return NextResponse.json(
            {
                error: 'Subtitle video generation failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 