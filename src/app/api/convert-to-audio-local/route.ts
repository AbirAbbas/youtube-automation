import { NextRequest, NextResponse } from 'next/server';
import { localStorageService } from '@/lib/local-storage-service';
import { getFullScriptWithSections, updateVideoScript } from '@/lib/db/videoScripts';
import { LocalAudioProcessor } from '@/lib/local-audio-utils';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    try {
        console.log(`🎤 [${requestId}] Starting audio conversion...`);

        const { scriptId } = await request.json();

        if (!scriptId) {
            return NextResponse.json(
                { error: 'Script ID is required' },
                { status: 400 }
            );
        }

        // Get the script and its sections
        const dbStartTime = Date.now();
        const { script, sections } = await getFullScriptWithSections(scriptId);
        const dbTime = Date.now() - dbStartTime;

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

        console.log(`📝 [${requestId}] Found ${sections.length} sections, total content: ${sections.reduce((sum, s) => sum + s.content.length, 0)} characters`);

        // Initialize audio processor
        const initStartTime = Date.now();
        const audioProcessor = new LocalAudioProcessor();
        const initTime = Date.now() - initStartTime;

        // Generate consistent audio for all sections
        const audioStartTime = Date.now();
        const audioSegments = await audioProcessor.generateConsistentAudio(sections, {
            addPauseBetweenSections: true,
            pauseDuration: 0.5
        });
        const audioTime = Date.now() - audioStartTime;

        console.log(`🎵 [${requestId}] Generated ${audioSegments.length} audio segments in ${audioTime}ms`);

        // Combine all audio segments
        const combineStartTime = Date.now();
        const combinedAudioBuffer = audioProcessor.combineAudioSegments(audioSegments);
        const combineTime = Date.now() - combineStartTime;

        const audioStats = {
            totalSizeMB: (combinedAudioBuffer.length / 1024 / 1024).toFixed(2),
            segments: audioSegments.length,
            combineTimeMs: combineTime
        };

        console.log(`🔗 [${requestId}] Combined audio: ${audioStats.totalSizeMB}MB in ${combineTime}ms`);

        // Upload to local storage
        const uploadStartTime = Date.now();
        console.log(`📤 [${requestId}] Uploading to local storage...`);

        const uploadResult = await localStorageService.uploadAudio(combinedAudioBuffer, {
            folder: 'video-scripts/audio',
            public_id: `script-${scriptId}-audio-local-${Date.now()}`,
            format: 'mp3'
        });

        const uploadTime = Date.now() - uploadStartTime;
        console.log(`🏠 [${requestId}] Local storage upload completed in ${uploadTime}ms`);

        if (!uploadResult.secure_url) {
            console.error(`❌ [${requestId}] Local storage upload failed - no secure URL returned`);
            throw new Error('Failed to upload audio to local storage');
        }

        console.log(`🔗 [${requestId}] Audio uploaded successfully:`, {
            url: uploadResult.secure_url,
            localPath: uploadResult.local_path,
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

        return NextResponse.json({
            success: true,
            audioUrl: uploadResult.secure_url,
            message: `Script successfully converted to audio with consistent levels`,
            metadata: {
                totalSections: sections.length,
                audioSegments: audioSegments.length,
                hasNormalization: true,
                processingMethod: 'section-by-section',
                storageType: 'local',
                localPath: uploadResult.local_path,
                performanceMetrics
            }
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ [${requestId}] Audio conversion failed after ${totalTime}ms:`, error);

        return NextResponse.json(
            {
                error: 'Audio conversion failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                requestId,
                totalTimeMs: totalTime
            },
            { status: 500 }
        );
    }
} 