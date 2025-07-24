import { NextRequest, NextResponse } from 'next/server';
import { cloudinaryService } from '@/lib/cloudinary';
import { getFullScriptWithSections, updateVideoScript } from '@/lib/db/videoScripts';
import { LocalAudioProcessor } from '@/lib/local-audio-utils';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = `local-tts-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log(`🎤 [${requestId}] Starting local TTS request at ${new Date().toISOString()}`);

    try {
        const { scriptId, voiceReference } = await request.json();

        console.log(`📝 [${requestId}] Request details:`, {
            scriptId,
            hasVoiceReference: !!voiceReference,
            voiceReferenceType: voiceReference ? typeof voiceReference : 'none'
        });

        if (!scriptId) {
            console.error(`❌ [${requestId}] Missing script ID`);
            return NextResponse.json(
                { error: 'Script ID is required' },
                { status: 400 }
            );
        }

        // Get the script and its sections
        const dbStartTime = Date.now();
        const { script, sections } = await getFullScriptWithSections(scriptId);
        const dbTime = Date.now() - dbStartTime;

        console.log(`📊 [${requestId}] Database query completed in ${dbTime}ms`);

        if (!script) {
            console.error(`❌ [${requestId}] Script not found: ${scriptId}`);
            return NextResponse.json(
                { error: 'Script not found' },
                { status: 404 }
            );
        }

        if (!sections || sections.length === 0) {
            console.error(`❌ [${requestId}] No script sections found for script: ${scriptId}`);
            return NextResponse.json(
                { error: 'No script content found' },
                { status: 400 }
            );
        }

        console.log(`📑 [${requestId}] Script loaded:`, {
            title: script.title,
            sectionsCount: sections.length,
            totalCharacters: sections.reduce((sum, s) => sum + s.content.length, 0),
            estimatedDuration: sections.reduce((sum, s) => sum + (s.estimatedDuration ? parseInt(s.estimatedDuration) : 30), 0)
        });

        // Initialize local audio processor with GPU acceleration
        const initStartTime = Date.now();
        console.log(`🔧 [${requestId}] Initializing LocalAudioProcessor with GPU acceleration...`);

        const audioProcessor = new LocalAudioProcessor({ preferGPU: true });
        await audioProcessor.initialize();

        const initTime = Date.now() - initStartTime;
        console.log(`⚡ [${requestId}] AudioProcessor initialized in ${initTime}ms`);

        // Check capabilities
        const capabilities = await audioProcessor.checkCapabilities();
        console.log(`🎯 [${requestId}] TTS Capabilities:`, {
            gpu: capabilities.gpu,
            cudaAvailable: capabilities.cudaAvailable,
            voiceCloning: capabilities.voiceCloning,
            multiLanguage: capabilities.multiLanguage,
            recommendedModel: capabilities.recommendedModel
        });

        // Generate consistent audio for all sections using Coqui TTS
        const audioStartTime = Date.now();
        console.log(`🎵 [${requestId}] Starting audio generation for ${sections.length} sections...`);

        const audioSegments = await audioProcessor.generateConsistentAudio(sections, {
            voiceReference: voiceReference || undefined,
            addPauseBetweenSections: true,
            pauseDuration: 0.5,
            language: 'en'
        });

        const audioTime = Date.now() - audioStartTime;
        console.log(`✅ [${requestId}] Audio generation completed in ${audioTime}ms (${(audioTime / 1000 / 60).toFixed(1)} minutes)`);

        // Combine all audio segments
        const combineStartTime = Date.now();
        const combinedAudioBuffer = audioProcessor.combineAudioSegments(audioSegments);
        const combineTime = Date.now() - combineStartTime;

        const audioStats = {
            segmentsCount: audioSegments.length,
            totalSizeBytes: combinedAudioBuffer.length,
            totalSizeMB: (combinedAudioBuffer.length / 1024 / 1024).toFixed(2),
            estimatedDurationSeconds: (combinedAudioBuffer.length / (24000 * 2)).toFixed(1),
            combineTimeMs: combineTime
        };

        console.log(`🔗 [${requestId}] Audio segments combined:`, audioStats);

        // Upload to Cloudinary
        const uploadStartTime = Date.now();
        console.log(`📤 [${requestId}] Uploading ${audioStats.totalSizeMB}MB to Cloudinary...`);

        const uploadResult = await cloudinaryService.uploadAudio(combinedAudioBuffer, {
            folder: 'video-scripts/audio',
            public_id: `script-${scriptId}-audio-local`,
            format: 'mp3'
        });

        const uploadTime = Date.now() - uploadStartTime;
        console.log(`☁️ [${requestId}] Cloudinary upload completed in ${uploadTime}ms`);

        if (!uploadResult.secure_url) {
            console.error(`❌ [${requestId}] Cloudinary upload failed - no secure URL returned`);
            throw new Error('Failed to upload audio to Cloudinary');
        }

        console.log(`🔗 [${requestId}] Audio uploaded successfully:`, {
            url: uploadResult.secure_url,
            cloudinaryPublicId: uploadResult.public_id,
            uploadTimeMs: uploadTime
        });

        // Update the script with the audio URL
        const updateStartTime = Date.now();
        await updateVideoScript(scriptId, {
            audioUrl: uploadResult.secure_url
        });
        const updateTime = Date.now() - updateStartTime;

        console.log(`💾 [${requestId}] Database updated in ${updateTime}ms`);

        const totalTime = Date.now() - startTime;
        const performanceMetrics = {
            totalTimeMs: totalTime,
            totalTimeMinutes: (totalTime / 1000 / 60).toFixed(2),
            dbQueryTimeMs: dbTime,
            initTimeMs: initTime,
            audioGenerationTimeMs: audioTime,
            combineTimeMs: combineTime,
            uploadTimeMs: uploadTime,
            dbUpdateTimeMs: updateTime,
            charactersPerSecond: Math.round(sections.reduce((sum, s) => sum + s.content.length, 0) / (audioTime / 1000)),
            mbPerSecond: (parseFloat(audioStats.totalSizeMB) / (uploadTime / 1000)).toFixed(2)
        };

        console.log(`📊 [${requestId}] Performance metrics:`, performanceMetrics);
        console.log(`🎉 [${requestId}] Request completed successfully in ${performanceMetrics.totalTimeMinutes} minutes`);

        return NextResponse.json({
            success: true,
            audioUrl: uploadResult.secure_url,
            message: 'Audio generated successfully using local TTS',
            details: {
                requestId,
                sections: audioSegments.length,
                duration: audioStats.estimatedDurationSeconds + 's',
                size: audioStats.totalSizeMB + 'MB',
                provider: `Coqui TTS (${capabilities.gpu ? 'RTX 4090' : 'CPU'})`,
                model: capabilities.recommendedModel,
                voiceCloning: capabilities.voiceCloning,
                multiLanguage: capabilities.multiLanguage,
                performance: {
                    totalTimeMinutes: performanceMetrics.totalTimeMinutes,
                    audioGenerationTimeMs: audioTime,
                    charactersPerSecond: performanceMetrics.charactersPerSecond
                }
            }
        });

    } catch (error) {
        const errorTime = Date.now() - startTime;
        console.error(`❌ [${requestId}] Error in local audio conversion after ${errorTime}ms:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: error instanceof Error ? error.constructor.name : typeof error
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                provider: 'Coqui TTS (Local)',
                requestId,
                errorTimeMs: errorTime
            },
            { status: 500 }
        );
    }
} 