/**
 * Audio Processing Utilities
 * Provides consistent audio generation and processing for ElevenLabs integration
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Optimized voice settings for consistent audio quality
export const CONSISTENT_VOICE_SETTINGS = {
    stability: 0.75,          // Higher stability for consistency across sections
    similarityBoost: 0.85,    // Higher similarity to maintain voice characteristics
    style: 0.0,               // No style variation to prevent quality fluctuations
    useSpeakerBoost: true     // Enhanced clarity and volume consistency
} as const;

export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice ID
export const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

export interface AudioSegment {
    buffer: Buffer;
    metadata: {
        sectionIndex: number;
        sectionTitle: string;
        duration?: number;
        type: 'audio' | 'silence';
    };
}

export interface AudioGenerationOptions {
    voiceId?: string;
    modelId?: string;
    voiceSettings?: typeof CONSISTENT_VOICE_SETTINGS;
    addPauseBetweenSections?: boolean;
    pauseDuration?: number; // in seconds
}

export class AudioProcessor {
    private elevenlabs: ElevenLabsClient;

    constructor(apiKey: string) {
        this.elevenlabs = new ElevenLabsClient({ apiKey });
    }

    /**
     * Generate audio for multiple text sections with consistent quality
     */
    async generateConsistentAudio(
        textSections: Array<{ content: string; title: string; orderIndex: number }>,
        options: AudioGenerationOptions = {}
    ): Promise<AudioSegment[]> {
        const {
            voiceId = DEFAULT_VOICE_ID,
            modelId = DEFAULT_MODEL_ID,
            voiceSettings = CONSISTENT_VOICE_SETTINGS,
            addPauseBetweenSections = true,
            pauseDuration = 0.5
        } = options;

        // Sort sections by order
        const sortedSections = textSections.sort((a, b) => a.orderIndex - b.orderIndex);
        const audioSegments: AudioSegment[] = [];

        console.log(`🎤 Generating audio for ${sortedSections.length} sections...`);

        for (let i = 0; i < sortedSections.length; i++) {
            const section = sortedSections[i];
            console.log(`Processing section ${i + 1}/${sortedSections.length}: ${section.title}`);

            try {
                // Generate audio for this section
                const audioBuffer = await this.generateSectionAudio(
                    section.content,
                    { voiceId, modelId, voiceSettings }
                );

                audioSegments.push({
                    buffer: audioBuffer,
                    metadata: {
                        sectionIndex: i,
                        sectionTitle: section.title,
                        type: 'audio'
                    }
                });

                // Add pause between sections (except after the last section)
                if (addPauseBetweenSections && i < sortedSections.length - 1) {
                    const silenceBuffer = this.createSilenceBuffer(pauseDuration);
                    audioSegments.push({
                        buffer: silenceBuffer,
                        metadata: {
                            sectionIndex: i + 0.5,
                            sectionTitle: `Pause after ${section.title}`,
                            duration: pauseDuration,
                            type: 'silence'
                        }
                    });
                }

                console.log(`✓ Completed section ${i + 1}: ${section.title}`);
            } catch (error) {
                console.error(`❌ Error processing section ${i + 1} (${section.title}):`, error);
                throw new Error(
                    `Failed to process section "${section.title}": ${error instanceof Error ? error.message : 'Unknown error'
                    }`
                );
            }
        }

        console.log(`✅ Generated ${audioSegments.length} audio segments`);
        return audioSegments;
    }

    /**
     * Generate audio for a single text section
     */
    private async generateSectionAudio(
        text: string,
        options: {
            voiceId: string;
            modelId: string;
            voiceSettings: typeof CONSISTENT_VOICE_SETTINGS;
        }
    ): Promise<Buffer> {
        const { voiceId, modelId, voiceSettings } = options;

        const audioResponse = await this.elevenlabs.textToSpeech.convert(voiceId, {
            text,
            modelId,
            voiceSettings
        });

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        const reader = audioResponse.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
        } finally {
            reader.releaseLock();
        }

        return Buffer.concat(chunks);
    }

    /**
     * Create a silence buffer for pauses between sections
     */
    createSilenceBuffer(durationInSeconds: number): Buffer {
        // Audio specifications for silence
        const sampleRate = 44100;
        const channels = 1;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const totalSamples = Math.floor(sampleRate * durationInSeconds);
        const dataSize = totalSamples * channels * bytesPerSample;

        // Create WAV file with header + silent audio data
        const buffer = Buffer.alloc(44 + dataSize);

        // WAV file header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + dataSize, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);           // PCM format
        buffer.writeUInt16LE(1, 20);            // Audio format (PCM)
        buffer.writeUInt16LE(channels, 22);      // Number of channels
        buffer.writeUInt32LE(sampleRate, 24);    // Sample rate
        buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // Byte rate
        buffer.writeUInt16LE(channels * bytesPerSample, 32); // Block align
        buffer.writeUInt16LE(bitsPerSample, 34); // Bits per sample
        buffer.write('data', 36);
        buffer.writeUInt32LE(dataSize, 40);

        // Fill with silence (zeros)
        buffer.fill(0, 44);

        return buffer;
    }

    /**
     * Combine multiple audio segments into a single buffer
     */
    combineAudioSegments(segments: AudioSegment[]): Buffer {
        console.log(`🔗 Combining ${segments.length} audio segments...`);
        const buffers = segments.map(segment => segment.buffer);
        return Buffer.concat(buffers);
    }

    /**
     * Get CloudinaryUploadOptions with audio optimization
     */
    static getOptimizedUploadOptions(baseOptions: any = {}) {
        return {
            ...baseOptions,
            transformation: {
                audio_codec: 'mp3',
                bit_rate: '128k',
                audio_frequency: 44100,
                ...baseOptions.transformation
            }
        };
    }
}

/**
 * Utility function to create an AudioProcessor instance
 */
export function createAudioProcessor(apiKey: string): AudioProcessor {
    return new AudioProcessor(apiKey);
}

/**
 * Quick function to generate consistent audio from text sections
 */
export async function generateConsistentAudioFromSections(
    apiKey: string,
    sections: Array<{ content: string; title: string; orderIndex: number }>,
    options?: AudioGenerationOptions
): Promise<Buffer> {
    const processor = new AudioProcessor(apiKey);
    const audioSegments = await processor.generateConsistentAudio(sections, options);
    return processor.combineAudioSegments(audioSegments);
} 