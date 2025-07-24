/**
 * Local Audio Processing Utilities
 * Provides consistent audio generation using Coqui TTS (XTTS-v2) for local inference
 * Replaces ElevenLabs with open-source alternative optimized for RTX 4090
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

// Optimized voice settings for Coqui TTS consistency
export const CONSISTENT_VOICE_SETTINGS = {
    temperature: 0.75,
    repetition_penalty: 2.0,
    length_penalty: 1.0,
    top_p: 0.85,
    top_k: 50,
    enable_text_splitting: true
} as const;

// Default voice reference (you can add your own voice samples)
export const DEFAULT_VOICE_REFERENCE = "reference_voice.wav";
export const DEFAULT_MODEL_NAME = "tts_models/en/ljspeech/vits"; // CPU fallback
export const ADVANCED_MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"; // High quality
export const DEFAULT_LANGUAGE = "en";

export interface AudioGenerationOptions {
    voiceReference?: string | string[];
    language?: string;
    modelName?: string;
    voiceSettings?: typeof CONSISTENT_VOICE_SETTINGS;
    addPauseBetweenSections?: boolean;
    pauseDuration?: number;
    useDeepSpeed?: boolean;
}

export interface AudioSegment {
    buffer: Buffer;
    metadata: {
        sectionIndex: number;
        sectionTitle: string;
        duration?: number;
        type: 'audio' | 'silence';
    };
}

export class LocalAudioProcessor {
    private pythonPath: string;
    private tempDir: string;
    private availableModels: string[] = [];
    private preferGPU: boolean = true; // Now default to GPU since CUDA is fixed
    private cudaAvailable: boolean = false;

    constructor(options: { preferGPU?: boolean } = {}) {
        this.pythonPath = process.env.PYTHON_PATH || 'python3';
        this.tempDir = process.env.TEMP_DIR || '/tmp';
        // Default to GPU, but allow override
        this.preferGPU = options.preferGPU !== false;
    }

    /**
     * Initialize and check available models and CUDA status
     */
    async initialize(): Promise<void> {
        const startTime = Date.now();
        console.log('🔄 LocalAudioProcessor: Starting initialization...');

        try {
            this.availableModels = await this.getAvailableModels();
            const modelsTime = Date.now() - startTime;
            console.log(`📋 LocalAudioProcessor: Found ${this.availableModels.length} available TTS models in ${modelsTime}ms`);

            // Check CUDA availability
            const cudaStartTime = Date.now();
            this.cudaAvailable = await this.checkCudaAvailability();
            const cudaTime = Date.now() - cudaStartTime;

            if (this.cudaAvailable) {
                console.log(`🚀 LocalAudioProcessor: CUDA available - GPU acceleration ready (checked in ${cudaTime}ms)`);
                this.preferGPU = true;
            } else {
                console.log(`💻 LocalAudioProcessor: CUDA not available - using CPU mode (checked in ${cudaTime}ms)`);
                this.preferGPU = false;
            }

            const totalTime = Date.now() - startTime;
            console.log(`✅ LocalAudioProcessor: Initialization completed in ${totalTime}ms`);
        } catch (error) {
            console.warn('⚠️ LocalAudioProcessor: Could not initialize properly, using defaults:', error);
            this.availableModels = [DEFAULT_MODEL_NAME];
            this.preferGPU = false;
        }
    }

    /**
     * Check if CUDA is properly available
     */
    private async checkCudaAvailability(): Promise<boolean> {
        try {
            return new Promise((resolve) => {
                const pythonProcess = spawn(this.pythonPath, ['-c',
                    'import torch; print("CUDA_OK" if torch.cuda.is_available() else "CUDA_NO")'
                ], { stdio: ['pipe', 'pipe', 'pipe'] });

                let output = '';
                pythonProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    resolve(output.includes('CUDA_OK'));
                });

                pythonProcess.on('error', () => {
                    resolve(false);
                });

                // Timeout after 5 seconds
                setTimeout(() => {
                    pythonProcess.kill();
                    resolve(false);
                }, 5000);
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the best available model for voice generation
     */
    private getBestAvailableModel(requestedModel?: string): string {
        if (requestedModel && this.availableModels.includes(requestedModel)) {
            return requestedModel;
        }

        // Prioritize high-quality models for RTX 4090
        const highQualityModels = [
            'tts_models/multilingual/multi-dataset/xtts_v2',
            'tts_models/en/multi-dataset/tortoise-v2',
            'tts_models/en/vctk/vits',
            'tts_models/en/ljspeech/vits',
            'tts_models/en/ljspeech/tacotron2-DDC'
        ];

        for (const model of highQualityModels) {
            if (this.availableModels.includes(model)) {
                console.log(`🎯 Selected high-quality model: ${model}`);
                return model;
            }
        }

        // Fallback to first available model
        console.warn('⚠️  Using fallback model - audio quality may be lower');
        return this.availableModels[0] || DEFAULT_MODEL_NAME;
    }

    /**
     * Generate audio for multiple text sections with consistent quality using Coqui TTS
     */
    async generateConsistentAudio(
        textSections: Array<{ content: string; title: string; orderIndex: number }>,
        options: AudioGenerationOptions = {}
    ): Promise<AudioSegment[]> {
        const startTime = Date.now();
        const {
            voiceReference = undefined,
            language = DEFAULT_LANGUAGE,
            modelName = DEFAULT_MODEL_NAME,
            voiceSettings = CONSISTENT_VOICE_SETTINGS,
            addPauseBetweenSections = true,
            pauseDuration = 0.5,
            useDeepSpeed = true
        } = options;

        // Sort sections by order
        const sortedSections = textSections.sort((a, b) => a.orderIndex - b.orderIndex);
        const audioSegments: AudioSegment[] = [];

        const totalCharacters = sortedSections.reduce((sum, section) => sum + section.content.length, 0);

        console.log(`🎤 LocalAudioProcessor: Starting audio generation for ${sortedSections.length} sections`);
        console.log(`📊 Generation stats:`, {
            totalSections: sortedSections.length,
            totalCharacters,
            averageCharactersPerSection: Math.round(totalCharacters / sortedSections.length),
            language,
            voiceCloning: !!voiceReference,
            addPauses: addPauseBetweenSections
        });

        for (let i = 0; i < sortedSections.length; i++) {
            const section = sortedSections[i];
            const sectionStartTime = Date.now();

            console.log(`🔄 [Section ${i + 1}/${sortedSections.length}] Processing: "${section.title}" (${section.content.length} chars)`);

            try {
                // Generate audio for this section using Coqui TTS
                const audioBuffer = await this.generateSectionAudio(
                    section.content,
                    { voiceReference, language, modelName, voiceSettings, useDeepSpeed }
                );

                const sectionTime = Date.now() - sectionStartTime;
                const sectionStats = {
                    sizeBytes: audioBuffer.length,
                    sizeMB: (audioBuffer.length / 1024 / 1024).toFixed(2),
                    generationTimeMs: sectionTime,
                    charactersPerSecond: Math.round(section.content.length / (sectionTime / 1000))
                };

                console.log(`✅ [Section ${i + 1}/${sortedSections.length}] Completed in ${sectionTime}ms:`, sectionStats);

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
                    console.log(`🔇 [Section ${i + 1}] Added ${pauseDuration}s pause`);
                }

            } catch (error) {
                const sectionTime = Date.now() - sectionStartTime;
                console.error(`❌ [Section ${i + 1}/${sortedSections.length}] Error after ${sectionTime}ms processing "${section.title}":`, error);
                throw new Error(
                    `Failed to process section "${section.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }

        const totalTime = Date.now() - startTime;
        const finalStats = {
            totalSegments: audioSegments.length,
            totalGenerationTimeMs: totalTime,
            totalGenerationTimeMinutes: (totalTime / 1000 / 60).toFixed(2),
            averageTimePerSection: Math.round(totalTime / sortedSections.length),
            totalCharacters,
            overallCharactersPerSecond: Math.round(totalCharacters / (totalTime / 1000))
        };

        console.log(`🎉 LocalAudioProcessor: Audio generation completed!`, finalStats);
        return audioSegments;
    }

    /**
     * Generate audio for a single text section using Coqui TTS
     */
    private async generateSectionAudio(
        text: string,
        options: {
            voiceReference?: string | string[];
            language: string;
            modelName: string;
            voiceSettings: typeof CONSISTENT_VOICE_SETTINGS;
            useDeepSpeed: boolean;
        }
    ): Promise<Buffer> {
        const { voiceReference, language, modelName, voiceSettings, useDeepSpeed } = options;

        const timestamp = Date.now();
        const outputPath = join(this.tempDir, `audio_output_${timestamp}.wav`);

        try {
            // Use simplified approach - direct command line TTS
            await this.runTTSCommand(text, outputPath, voiceReference, language);

            // Read generated audio file
            if (!existsSync(outputPath)) {
                throw new Error(`Audio file was not generated: ${outputPath}`);
            }

            const audioBuffer = readFileSync(outputPath);

            // Cleanup
            try {
                unlinkSync(outputPath);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp file:', cleanupError);
            }

            return audioBuffer;
        } catch (error) {
            console.error('Error executing Coqui TTS:', error);
            throw error;
        }
    }

    /**
     * Run TTS command with intelligent GPU/CPU selection
     */
    private async runTTSCommand(
        text: string,
        outputPath: string,
        voiceReference?: string | string[],
        language: string = 'en'
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const modelName = this.getBestAvailableModel();
            console.log(`🎤 Generating audio with: ${modelName} (${this.preferGPU ? 'GPU' : 'CPU'} mode)`);

            const args = [
                '--model_name', modelName,
                '--text', text,
                '--out_path', outputPath
            ];

            // Language support for multilingual models
            if (modelName.includes('xtts') || modelName.includes('multilingual')) {
                args.push('--language_idx', language);
            }

            // Only add CUDA if we know it works
            if (this.preferGPU && this.cudaAvailable) {
                args.push('--use_cuda', 'true');
            }

            // Voice cloning support
            if (voiceReference && (modelName.includes('xtts') || modelName.includes('tortoise'))) {
                const voiceFiles = Array.isArray(voiceReference) ? voiceReference : [voiceReference];
                voiceFiles.forEach(voiceFile => {
                    if (voiceFile && existsSync(voiceFile)) {
                        args.push('--speaker_wav', voiceFile);
                        console.log(`🎭 Using voice reference: ${voiceFile}`);
                    }
                });
            }

            console.log(`🚀 TTS Command: tts ${args.join(' ')}`);

            const ttsProcess = spawn('tts', args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            ttsProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                // Show progress for long operations
                if (output.includes('Loading') || output.includes('Progress') || output.includes('%')) {
                    process.stdout.write('.');
                }
            });

            ttsProcess.stderr.on('data', (data) => {
                const error = data.toString();
                stderr += error;
                // Ignore CUDA warnings since we handle fallback
                if (!error.includes('libcuda') && !error.includes('CUDA') && !error.includes('cudnn')) {
                    console.log('TTS:', error.trim());
                }
            });

            ttsProcess.on('close', (code) => {
                console.log(); // New line after progress dots

                if (code === 0) {
                    console.log('✅ Audio generation completed successfully');
                    resolve();
                } else {
                    // If this was a GPU attempt and failed, try CPU
                    if (this.preferGPU && stderr.includes('cuda')) {
                        console.log('⚠️  GPU failed, retrying with CPU...');
                        this.preferGPU = false;
                        this.cudaAvailable = false;
                        this.runTTSCommand(text, outputPath, voiceReference, language)
                            .then(resolve)
                            .catch(reject);
                        return;
                    }

                    console.error(`❌ TTS process failed with code ${code}`);
                    if (stderr.trim()) {
                        console.error('Error details:', stderr.trim());
                    }
                    reject(new Error(`TTS process failed: ${stderr || 'Unknown error'}`));
                }
            });

            ttsProcess.on('error', (error) => {
                console.error('❌ Failed to start TTS process:', error);
                reject(new Error(`Failed to start TTS process: ${error.message}`));
            });
        });
    }

    /**
     * Create silence buffer for pauses between sections
     */
    private createSilenceBuffer(duration: number): Buffer {
        const sampleRate = 24000; // Match Coqui TTS output
        const samples = Math.floor(sampleRate * duration);
        const silenceArray = new Int16Array(samples);

        // Convert to buffer (16-bit PCM)
        const buffer = Buffer.allocUnsafe(samples * 2);
        for (let i = 0; i < samples; i++) {
            buffer.writeInt16LE(0, i * 2);
        }

        return buffer;
    }

    /**
     * Combine multiple audio segments into a single audio buffer
     */
    combineAudioSegments(audioSegments: AudioSegment[]): Buffer {
        console.log(`🔗 Combining ${audioSegments.length} audio segments...`);

        const audioBuffers = audioSegments.map(segment => segment.buffer);
        const combinedBuffer = Buffer.concat(audioBuffers);

        console.log(`✅ Combined audio: ${(combinedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        return combinedBuffer;
    }

    /**
     * Get information about available Coqui TTS models
     */
    async getAvailableModels(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const listProcess = spawn('tts', ['--list_models'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            listProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            listProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            listProcess.on('close', (code) => {
                if (code === 0) {
                    // Parse model names from output
                    const models: string[] = [];
                    const lines = stdout.split('\n');

                    for (const line of lines) {
                        if (line.includes('tts_models/')) {
                            const match = line.match(/tts_models\/[^\s]+/);
                            if (match) {
                                models.push(match[0]);
                            }
                        }
                    }

                    resolve(models);
                } else {
                    reject(new Error(`Failed to list models: ${stderr}`));
                }
            });

            listProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Check current capabilities
     */
    async checkCapabilities(): Promise<{
        gpu: boolean;
        voiceCloning: boolean;
        multiLanguage: boolean;
        recommendedModel: string;
        cudaAvailable: boolean;
    }> {
        const model = this.getBestAvailableModel();

        return {
            gpu: this.preferGPU && this.cudaAvailable,
            voiceCloning: model.includes('xtts') || model.includes('tortoise'),
            multiLanguage: model.includes('multilingual') || model.includes('xtts'),
            recommendedModel: model,
            cudaAvailable: this.cudaAvailable
        };
    }
}

/**
 * Quick function to generate consistent audio from text sections using local TTS
 */
export async function generateConsistentAudioFromSections(
    sections: Array<{ content: string; title: string; orderIndex: number }>,
    options?: AudioGenerationOptions & { preferGPU?: boolean }
): Promise<Buffer> {
    const processor = new LocalAudioProcessor({ preferGPU: options?.preferGPU });
    await processor.initialize();

    // Check capabilities and warn about limitations
    const capabilities = await processor.checkCapabilities();
    console.log('🔧 TTS Capabilities:', capabilities);

    const audioSegments = await processor.generateConsistentAudio(sections, options);
    return processor.combineAudioSegments(audioSegments);
} 