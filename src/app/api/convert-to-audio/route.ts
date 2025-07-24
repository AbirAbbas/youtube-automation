import { NextRequest, NextResponse } from 'next/server';
import { cloudinaryService } from '@/lib/cloudinary';
import { getFullScriptWithSections, updateVideoScript } from '@/lib/db/videoScripts';
import { AudioProcessor } from '@/lib/audio-utils';

export async function POST(request: NextRequest) {
    try {
        const { scriptId } = await request.json();

        if (!scriptId) {
            return NextResponse.json(
                { error: 'Script ID is required' },
                { status: 400 }
            );
        }

        if (!process.env.ELEVENLABS_API_KEY) {
            return NextResponse.json(
                { error: 'ElevenLabs API key not configured' },
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

        if (!sections || sections.length === 0) {
            return NextResponse.json(
                { error: 'No script content found' },
                { status: 400 }
            );
        }

        console.log(`🎤 Starting audio conversion for script ${scriptId}...`);

        // Initialize audio processor
        const audioProcessor = new AudioProcessor(process.env.ELEVENLABS_API_KEY);

        // Generate consistent audio for all sections
        const audioSegments = await audioProcessor.generateConsistentAudio(sections, {
            addPauseBetweenSections: true,
            pauseDuration: 0.5
        });

        // Combine all audio segments
        const combinedAudioBuffer = audioProcessor.combineAudioSegments(audioSegments);

        console.log('📤 Uploading to Cloudinary with normalization...');

        // Upload to Cloudinary with audio optimization and normalization
        const cloudinaryResult = await cloudinaryService.uploadAudio(
            combinedAudioBuffer,
            AudioProcessor.getOptimizedUploadOptions({
                folder: 'script-audio',
                public_id: `script-${scriptId}-${Date.now()}`,
                tags: ['script-audio', `script-${scriptId}`, 'normalized', 'consistent-levels']
            })
        );

        // Update the script with the audio URL
        await updateVideoScript(scriptId, {
            audioUrl: cloudinaryResult.secure_url
        });

        console.log('✅ Audio conversion completed successfully');

        return NextResponse.json({
            success: true,
            audioUrl: cloudinaryResult.secure_url,
            message: `Script successfully converted to audio with consistent levels`,
            metadata: {
                totalSections: sections.length,
                audioSegments: audioSegments.length,
                hasNormalization: true,
                processingMethod: 'section-by-section',
                cloudinaryUrl: cloudinaryResult.secure_url
            }
        });

    } catch (error) {
        console.error('❌ Error converting script to audio:', error);
        return NextResponse.json(
            {
                error: 'Failed to convert script to audio',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 