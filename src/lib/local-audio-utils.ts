/**
 * Local Audio Processing Utilities
 * Provides consistent audio generation using Coqui TTS (XTTS-v2) for local inference
 * Replaces ElevenLabs with open-source alternative optimized for RTX 4090
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

// Model configurations for different TTS engines
const TTS_MODELS = {
    COQUI_XTTS: {
        name: 'xtts_v2',
        description: 'Coqui XTTS v2 - Fast and reliable',
        command: 'tts',
        args: ['--model_name', 'tts_models/multilingual/multi-dataset/xtts_v2']
    },
    KOKORO: {
        name: 'kokoro',
        description: 'Kokoro TTS - Ultra-fast 82M parameter model with natural sound',
        pythonPackage: 'kokoro>=0.9.2',
        setup: `
# Install Kokoro TTS (much smaller and faster than XTTS)
pip install kokoro>=0.9.2 soundfile
apt-get -qq -y install espeak-ng

# Usage:
from kokoro import KPipeline
pipeline = KPipeline(lang_code='a')
generator = pipeline(text, voice='af_heart')
        `,
        voices: ['af_heart', 'af_bella', 'af_sarah', 'am_adam', 'am_michael', 'bf_emma', 'bf_isabella', 'bm_george']
    }
} as const;

// Enhanced voice settings for better natural sound
export const ENHANCED_VOICE_SETTINGS = {
    // Coqui TTS settings
    temperature: 0.65,        // Lower for more stable, natural sound
    repetition_penalty: 1.8,  // Reduced to allow more natural repetition
    length_penalty: 1.1,      // Slightly favor longer outputs
    top_p: 0.9,              // Higher for more varied, natural speech
    top_k: 60,               // Increased for better word choice
    enable_text_splitting: true,

    // Kokoro-specific settings (if using Kokoro)
    kokoro_voice: 'af_heart', // Most natural sounding voice
    emotion_intensity: 0.7,   // Moderate emotion for natural feel
    speaking_rate: 1.0,       // Natural speaking pace
    pitch_variance: 0.3       // Slight pitch variation for naturalness
} as const;

// TTS Engine selection via environment variable
const DEFAULT_TTS_ENGINE = process.env.TTS_ENGINE || 'kokoro'; // Default to Kokoro
const DEFAULT_LANGUAGE = 'en';
// CPU fallback
export const DEFAULT_MODEL_NAME = "tts_models/en/ljspeech/vits";
// RTX 4090 optimized model
export const ADVANCED_MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2";

// Performance optimizations
export const PERFORMANCE_SETTINGS = {
    batchSize: 4, // Process multiple sections in parallel
    maxChunkLength: 200 // Optimal text chunk size
} as const;

export interface AudioGenerationOptions {
    voiceReference?: string | string[];
    language?: string;
    modelName?: string;
    voiceSettings?: typeof ENHANCED_VOICE_SETTINGS;
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
        isPlaceholder?: boolean;
    };
}

export class LocalAudioProcessor {
    private pythonPath: string;
    private tempDir: string;
    private availableModels: string[] = [];
    private preferGPU: boolean = true; // Now default to GPU since CUDA is fixed
    private cudaAvailable: boolean = false;
    private isRTX4090: boolean = false; // Track if we have RTX 4090
    private ttsEngine: string; // Add TTS engine selection

    constructor(options: { preferGPU?: boolean; ttsEngine?: string } = {}) {
        this.pythonPath = process.env.PYTHON_PATH || 'python3';
        this.tempDir = process.env.TEMP_DIR || '/tmp';
        // Default to GPU, but allow override
        this.preferGPU = options.preferGPU !== false;
        // Use environment variable or passed option, default to Kokoro
        this.ttsEngine = options.ttsEngine || DEFAULT_TTS_ENGINE;

        console.log(`🎤 TTS Engine: ${this.ttsEngine.toUpperCase()}`);
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

            // Check CUDA availability and GPU type
            const cudaStartTime = Date.now();
            const gpuInfo = await this.checkGPUCapabilities();
            this.cudaAvailable = gpuInfo.cudaAvailable;
            this.isRTX4090 = gpuInfo.isRTX4090;
            const cudaTime = Date.now() - cudaStartTime;

            if (this.cudaAvailable) {
                const gpuName = this.isRTX4090 ? 'RTX 4090' : 'GPU';
                console.log(`🚀 LocalAudioProcessor: CUDA available - ${gpuName} acceleration ready (checked in ${cudaTime}ms)`);
                this.preferGPU = true;

                if (this.isRTX4090) {
                    console.log(`⚡ RTX 4090 detected - enabling advanced optimizations`);
                }
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
     * Check GPU capabilities including RTX 4090 detection
     */
    private async checkGPUCapabilities(): Promise<{
        cudaAvailable: boolean;
        isRTX4090: boolean;
        gpuMemory?: number;
    }> {
        try {
            return new Promise((resolve) => {
                const pythonProcess = spawn(this.pythonPath, ['-c', `
import torch
cuda_available = torch.cuda.is_available()
gpu_name = torch.cuda.get_device_name(0) if cuda_available else "None"
gpu_memory = torch.cuda.get_device_properties(0).total_memory // (1024**3) if cuda_available else 0
is_rtx_4090 = "RTX 4090" in gpu_name
print(f"CUDA:{cuda_available}|RTX4090:{is_rtx_4090}|MEM:{gpu_memory}")
                `], { stdio: ['pipe', 'pipe', 'pipe'] });

                let output = '';
                pythonProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    const match = output.match(/CUDA:(\w+)\|RTX4090:(\w+)\|MEM:(\d+)/);
                    if (match) {
                        resolve({
                            cudaAvailable: match[1] === 'True',
                            isRTX4090: match[2] === 'True',
                            gpuMemory: parseInt(match[3])
                        });
                    } else {
                        resolve({ cudaAvailable: false, isRTX4090: false });
                    }
                });

                pythonProcess.on('error', () => {
                    resolve({ cudaAvailable: false, isRTX4090: false });
                });

                // Timeout after 5 seconds
                setTimeout(() => {
                    pythonProcess.kill();
                    resolve({ cudaAvailable: false, isRTX4090: false });
                }, 5000);
            });
        } catch (error) {
            return { cudaAvailable: false, isRTX4090: false };
        }
    }

    /**
     * Get the best TTS model - simple and reliable
     */
    private getBestAvailableModel(hasVoiceReference: boolean = false): string {
        // For voice cloning, use XTTS-v2 if available
        if (hasVoiceReference && this.availableModels.includes('tts_models/multilingual/multi-dataset/xtts_v2')) {
            console.log(`🎯 Using XTTS-v2 for voice cloning`);
            return 'tts_models/multilingual/multi-dataset/xtts_v2';
        }

        // Default: Use ljspeech/vits (single-speaker, fast, reliable)
        if (this.availableModels.includes('tts_models/en/ljspeech/vits')) {
            console.log(`🎯 Using ljspeech/vits (reliable single-speaker model)`);
            return 'tts_models/en/ljspeech/vits';
        }

        // Fallback to first available model
        console.warn(`⚠️ Using fallback model: ${this.availableModels[0] || DEFAULT_MODEL_NAME}`);
        return this.availableModels[0] || DEFAULT_MODEL_NAME;
    }

    /**
     * Generate audio for multiple text sections with RTX 4090 optimizations
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
            voiceSettings = ENHANCED_VOICE_SETTINGS,
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
            addPauses: addPauseBetweenSections,
            isRTX4090: this.isRTX4090,
            usingGPU: this.preferGPU && this.cudaAvailable,
            hasVoiceReference: !!voiceReference
        });

        // Use batch processing for multiple sections to improve performance
        if (sortedSections.length > 1) {
            console.log(`⚡ Batch processing enabled for ${sortedSections.length} sections`);
            return this.generateBatchedAudio(sortedSections, options);
        }

        // Standard processing for non-RTX 4090 or single sections
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
                }

                console.log(`✓ Completed section ${i + 1}: ${section.title}`);
            } catch (error) {
                console.error(`❌ Error processing section ${i + 1} (${section.title}):`, error);
                throw new Error(
                    `Failed to process section "${section.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }

        const totalTime = Date.now() - startTime;
        const performance = {
            totalTimeMs: totalTime,
            totalTimeMinutes: (totalTime / 1000 / 60).toFixed(2),
            charactersPerSecond: Math.round(totalCharacters / (totalTime / 1000)),
            sectionsPerMinute: Math.round(sortedSections.length / (totalTime / 1000 / 60))
        };

        console.log(`✅ Generated ${audioSegments.length} audio segments in ${performance.totalTimeMinutes} minutes`);
        console.log(`📈 Performance: ${performance.charactersPerSecond} chars/sec, ${performance.sectionsPerMinute} sections/min`);

        return audioSegments;
    }

    /**
     * Batch processing for better performance
     */
    private async generateBatchedAudio(
        sections: Array<{ content: string; title: string; orderIndex: number }>,
        options: AudioGenerationOptions = {}
    ): Promise<AudioSegment[]> {
        const { batchSize } = PERFORMANCE_SETTINGS;
        const audioSegments: AudioSegment[] = [];
        const failedSections: Array<{ section: any; error: any }> = [];

        console.log(`⚡ Batch processing: ${sections.length} sections in batches of ${batchSize}`);

        // Process sections in batches
        for (let i = 0; i < sections.length; i += batchSize) {
            const batch = sections.slice(i, i + batchSize);
            console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sections.length / batchSize)} (${batch.length} sections)`);

            // Process batch with individual error handling
            const batchPromises = batch.map(async (section, batchIndex) => {
                const globalIndex = i + batchIndex;
                const sectionStartTime = Date.now();

                console.log(`  ⚡ [${globalIndex + 1}/${sections.length}] Starting "${section.title}" (${section.content.length} chars)`);

                try {
                    const audioBuffer = await this.generateSectionAudio(
                        section.content,
                        {
                            voiceReference: options.voiceReference,
                            language: options.language || DEFAULT_LANGUAGE,
                            modelName: options.modelName || DEFAULT_MODEL_NAME,
                            voiceSettings: options.voiceSettings || ENHANCED_VOICE_SETTINGS,
                            useDeepSpeed: options.useDeepSpeed !== false
                        }
                    );

                    const sectionTime = Date.now() - sectionStartTime;
                    console.log(`  ✅ [${globalIndex + 1}/${sections.length}] Completed "${section.title}" in ${sectionTime}ms`);

                    return {
                        success: true,
                        segment: {
                            buffer: audioBuffer,
                            metadata: {
                                sectionIndex: globalIndex,
                                sectionTitle: section.title,
                                type: 'audio' as const
                            }
                        }
                    };
                } catch (error) {
                    const sectionTime = Date.now() - sectionStartTime;
                    console.error(`  ❌ [${globalIndex + 1}/${sections.length}] Failed "${section.title}" after ${sectionTime}ms:`, error);

                    // Store failed section for retry or fallback
                    failedSections.push({ section: { ...section, globalIndex }, error });

                    return {
                        success: false,
                        error,
                        sectionTitle: section.title,
                        globalIndex
                    };
                }
            });

            // Wait for all batch results (successful and failed)
            const batchResults = await Promise.allSettled(batchPromises);

            // Process results and extract successful segments
            batchResults.forEach((result, batchIndex) => {
                const globalIndex = i + batchIndex;

                if (result.status === 'fulfilled' && result.value && result.value.success && result.value.segment) {
                    audioSegments.push(result.value.segment);
                    console.log(`  📦 [${globalIndex + 1}/${sections.length}] Added segment to collection`);
                } else {
                    const section = batch[batchIndex];
                    console.error(`  ⚠️ [${globalIndex + 1}/${sections.length}] Skipping failed section: "${section.title}"`);
                }
            });

            console.log(`  🔄 Batch ${Math.floor(i / batchSize) + 1} completed: ${audioSegments.length - (i)} successful segments added`);
        }

        console.log(`📊 Batch processing summary: ${audioSegments.length}/${sections.length} sections successful, ${failedSections.length} failed`);

        // Retry failed sections individually with more conservative settings
        if (failedSections.length > 0 && failedSections.length < sections.length) {
            console.log(`🔁 Retrying ${failedSections.length} failed sections with conservative settings...`);

            for (const { section, error } of failedSections) {
                try {
                    console.log(`  🔄 Retrying section "${section.title}" (attempt 2/2)`);

                    // Use more conservative settings for retry
                    const conservativeOptions = {
                        voiceReference: undefined, // Remove voice reference for retry
                        language: options.language || DEFAULT_LANGUAGE,
                        modelName: 'tts_models/en/ljspeech/vits', // Use most reliable model
                        voiceSettings: options.voiceSettings || ENHANCED_VOICE_SETTINGS,
                        useDeepSpeed: false // Disable optimization for stability
                    };

                    const audioBuffer = await this.generateSectionAudio(section.content, conservativeOptions);

                    audioSegments.push({
                        buffer: audioBuffer,
                        metadata: {
                            sectionIndex: section.globalIndex,
                            sectionTitle: section.title,
                            type: 'audio' as const
                        }
                    });

                    console.log(`  ✅ Retry successful for "${section.title}"`);
                } catch (retryError) {
                    console.error(`  ❌ Retry failed for "${section.title}":`, retryError);

                    // Create a placeholder segment to maintain structure
                    const silenceBuffer = this.createSilenceBuffer(2.0); // 2 seconds of silence
                    audioSegments.push({
                        buffer: silenceBuffer,
                        metadata: {
                            sectionIndex: section.globalIndex,
                            sectionTitle: `${section.title} (Placeholder - Generation Failed)`,
                            type: 'silence' as const,
                            isPlaceholder: true
                        }
                    });

                    console.log(`  🔇 Added silence placeholder for "${section.title}"`);
                }
            }
        }

        // Sort segments by section index to maintain order
        audioSegments.sort((a, b) => a.metadata.sectionIndex - b.metadata.sectionIndex);

        console.log(`🎵 Final segments: ${audioSegments.length} total (${audioSegments.filter(s => s.metadata.type === 'audio').length} audio, ${audioSegments.filter(s => s.metadata.type === 'silence' && !s.metadata.isPlaceholder).length} pauses, ${audioSegments.filter(s => s.metadata.isPlaceholder).length} placeholders)`);

        // Add pauses between ALL sections (not just within batches)
        if (options.addPauseBetweenSections && sections.length > 1) {
            const segmentsWithPauses: AudioSegment[] = [];

            for (let i = 0; i < audioSegments.length; i++) {
                segmentsWithPauses.push(audioSegments[i]);

                // Add pause after each section except the last one
                if (i < audioSegments.length - 1) {
                    const pauseIndex = audioSegments[i].metadata.sectionIndex + 0.5;
                    const silenceBuffer = this.createSilenceBuffer(options.pauseDuration || 0.5);
                    segmentsWithPauses.push({
                        buffer: silenceBuffer,
                        metadata: {
                            sectionIndex: pauseIndex,
                            sectionTitle: `Pause after ${audioSegments[i].metadata.sectionTitle}`,
                            duration: options.pauseDuration || 0.5,
                            type: 'silence'
                        }
                    });
                }
            }

            return segmentsWithPauses.sort((a, b) => a.metadata.sectionIndex - b.metadata.sectionIndex);
        }

        return audioSegments.sort((a, b) => a.metadata.sectionIndex - b.metadata.sectionIndex);
    }

    /**
     * Generate audio for a single text section using the configured TTS engine
     */
    private async generateSectionAudio(
        text: string,
        options: {
            voiceReference?: string | string[];
            language: string;
            modelName: string;
            voiceSettings: typeof ENHANCED_VOICE_SETTINGS;
            useDeepSpeed: boolean;
        }
    ): Promise<Buffer> {
        // Route to appropriate TTS engine
        if (this.ttsEngine === 'kokoro') {
            return this.generateKokoroAudio(text, options);
        } else {
            return this.generateCoquiAudio(text, options);
        }
    }

    /**
     * Generate audio using Kokoro TTS - Ultra-fast 82M parameter model
     */
    private async generateKokoroAudio(
        text: string,
        options: {
            voiceReference?: string | string[];
            language: string;
            modelName: string;
            voiceSettings: typeof ENHANCED_VOICE_SETTINGS;
            useDeepSpeed: boolean;
        }
    ): Promise<Buffer> {
        const { voiceSettings } = options;
        const timestamp = Date.now();
        const outputPath = join(this.tempDir, `kokoro_audio_${timestamp}.wav`);
        const pythonScriptPath = join(this.tempDir, `kokoro_script_${timestamp}.py`);

        try {
            // Create Python script for Kokoro TTS
            const kokoroScript = this.createKokoroScript(text, outputPath, voiceSettings);
            writeFileSync(pythonScriptPath, kokoroScript);

            // Execute Kokoro TTS Python script
            await this.runKokoroCommand(pythonScriptPath);

            // Read generated audio file
            if (!existsSync(outputPath)) {
                throw new Error(`Kokoro audio file was not generated: ${outputPath}`);
            }

            const audioBuffer = readFileSync(outputPath);

            // Cleanup
            try {
                unlinkSync(outputPath);
                unlinkSync(pythonScriptPath);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp files:', cleanupError);
            }

            return audioBuffer;
        } catch (error) {
            console.error('Error executing Kokoro TTS:', error);
            throw error;
        }
    }

    /**
     * Generate audio using Coqui TTS (original implementation)
     */
    private async generateCoquiAudio(
        text: string,
        options: {
            voiceReference?: string | string[];
            language: string;
            modelName: string;
            voiceSettings: typeof ENHANCED_VOICE_SETTINGS;
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
     * Run TTS command with RTX 4090 optimizations
     */
    private async runTTSCommand(
        text: string,
        outputPath: string,
        voiceReference?: string | string[],
        language: string = 'en'
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const hasVoiceReference = !!(voiceReference);
            const modelName = this.getBestAvailableModel(hasVoiceReference);
            const gpuMode = this.preferGPU ? (this.isRTX4090 ? 'RTX 4090' : 'GPU') : 'CPU';
            console.log(`🎤 Generating audio with: ${modelName} (${gpuMode} mode)`);

            const args = [
                '--model_name', modelName,
                '--text', text,
                '--out_path', outputPath
            ];

            // Language support for multilingual models
            if (modelName.includes('xtts') || modelName.includes('multilingual')) {
                args.push('--language_idx', language);
            }

            // GPU optimizations
            if (this.preferGPU && this.cudaAvailable) {
                args.push('--use_cuda', 'true');
                console.log(`⚡ GPU acceleration enabled`);
            }

            // Voice cloning and speaker selection
            if (voiceReference && (modelName.includes('xtts') || modelName.includes('tortoise'))) {
                const voiceFiles = Array.isArray(voiceReference) ? voiceReference : [voiceReference];
                voiceFiles.forEach(voiceFile => {
                    if (voiceFile && existsSync(voiceFile)) {
                        args.push('--speaker_wav', voiceFile);
                        console.log(`🎭 Using voice reference: ${voiceFile}`);
                    }
                });
            } else if (modelName.includes('xtts') || modelName.includes('multi-dataset') || modelName.includes('vctk')) {
                // Multi-speaker models need a speaker selection
                args.push('--speaker_idx', '0'); // Default to first speaker
                console.log(`🎤 Using default speaker (idx: 0) for multi-speaker model`);
            }

            console.log(`🚀 TTS Command: tts ${args.join(' ')}`);

            // Set environment variables for optimal GPU performance
            const env = { ...process.env };
            if (this.cudaAvailable) {
                env.CUDA_VISIBLE_DEVICES = '0'; // Use first GPU
                env.CUDA_LAUNCH_BLOCKING = '0'; // Async CUDA for performance
            }

            const ttsProcess = spawn('tts', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env
            });

            let stdout = '';
            let stderr = '';
            let lastProgressTime = Date.now();

            ttsProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;

                // Better progress tracking
                const now = Date.now();
                if (output.includes('Loading') || output.includes('Progress') || output.includes('%')) {
                    if (now - lastProgressTime > 1000) { // Throttle progress output
                        process.stdout.write('.');
                        lastProgressTime = now;
                    }
                }
            });

            ttsProcess.stderr.on('data', (data) => {
                const error = data.toString();
                stderr += error;

                // Filter out common but harmless warnings
                const harmlessWarnings = [
                    'libcuda', 'CUDA', 'cudnn', 'UserWarning',
                    'FutureWarning', 'torch.jit', 'torchscript'
                ];

                if (!harmlessWarnings.some(warning => error.includes(warning))) {
                    console.log('TTS:', error.trim());
                }
            });

            ttsProcess.on('close', (code) => {
                console.log(); // New line after progress dots

                if (code === 0) {
                    console.log('✅ Audio generation completed successfully');
                    resolve();
                } else {
                    // Intelligent fallback strategy
                    if (this.preferGPU && this.isRTX4090 && (stderr.includes('cuda') || stderr.includes('memory'))) {
                        console.log('⚠️  RTX 4090 advanced features failed, retrying with basic GPU settings...');
                        this.isRTX4090 = false; // Disable RTX 4090 optimizations
                        this.runTTSCommand(text, outputPath, voiceReference, language)
                            .then(resolve)
                            .catch(reject);
                        return;
                    } else if (this.preferGPU && stderr.includes('cuda')) {
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
                reject(error);
            });

            // Set a timeout for very long generations
            setTimeout(() => {
                ttsProcess.kill();
                reject(new Error('TTS generation timed out after 5 minutes'));
            }, 5 * 60 * 1000); // 5 minutes timeout
        });
    }

    /**
     * Create Python script for Kokoro TTS generation
     */
    private createKokoroScript(text: string, outputPath: string, voiceSettings: typeof ENHANCED_VOICE_SETTINGS): string {
        const voice = voiceSettings.kokoro_voice || 'af_heart';
        const speakingRate = voiceSettings.speaking_rate || 1.0;
        const emotionIntensity = voiceSettings.emotion_intensity || 0.7;

        return `#!/usr/bin/env python3
import sys
import os
import warnings
warnings.filterwarnings("ignore")

try:
    from kokoro import KPipeline
    import soundfile as sf
    import numpy as np
    
    def main():
        print("🎤 Initializing Kokoro TTS...")
        
        # Initialize Kokoro pipeline
        pipeline = KPipeline(lang_code='a')
        
        # Text to synthesize
        text = """${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""
        
        # Generate audio with specified voice
        print(f"🔊 Using SINGLE voice for this section: ${voice}")
        print(f"📝 Text preview: {text[:50]}...")
        audio_generator = pipeline(text, voice='${voice}')
        
        # Convert generator to numpy array - handle Kokoro TTS Result objects
        audio_chunks = []
        for result in audio_generator:
            # Kokoro TTS returns Result objects with audio data
            if hasattr(result, 'audio'):
                # Extract audio from Result object (likely a PyTorch tensor)
                audio_data = result.audio
                
                # Handle PyTorch tensors
                if hasattr(audio_data, 'detach'):
                    # PyTorch tensor - convert to numpy
                    audio_data = audio_data.detach().cpu().numpy()
                    audio_chunks.extend(audio_data.flatten())
                elif isinstance(audio_data, np.ndarray):
                    audio_chunks.extend(audio_data.flatten())
                elif hasattr(audio_data, '__array__'):
                    # Can be converted to numpy
                    audio_chunks.extend(np.array(audio_data).flatten())
                else:
                    # Try as single value
                    try:
                        audio_chunks.append(float(audio_data))
                    except (ValueError, TypeError):
                        print(f"⚠️ Could not convert audio data: {type(audio_data)}")
                        
            elif hasattr(result, 'data'):
                # Alternative attribute name
                audio_data = result.data
                
                # Handle PyTorch tensors
                if hasattr(audio_data, 'detach'):
                    # PyTorch tensor - convert to numpy
                    audio_data = audio_data.detach().cpu().numpy()
                    audio_chunks.extend(audio_data.flatten())
                elif isinstance(audio_data, np.ndarray):
                    audio_chunks.extend(audio_data.flatten())
                elif hasattr(audio_data, '__array__'):
                    # Can be converted to numpy
                    audio_chunks.extend(np.array(audio_data).flatten())
                else:
                    # Try as single value
                    try:
                        audio_chunks.append(float(audio_data))
                    except (ValueError, TypeError):
                        print(f"⚠️ Could not convert data: {type(audio_data)}")
            elif isinstance(result, np.ndarray):
                # Direct numpy array
                audio_chunks.extend(result.flatten())
            elif isinstance(result, (int, float)):
                # Direct number
                audio_chunks.append(float(result))
            else:
                # Try to convert the result itself or extract attributes
                try:
                    # Check if result has a __array__ method
                    if hasattr(result, '__array__'):
                        audio_chunks.extend(np.array(result).flatten())
                    else:
                        print(f"🔍 Debugging: Result type {type(result)}, attributes: {dir(result)}")
                        # Try common audio attributes
                        for attr in ['audio', 'data', 'samples', 'wav', 'signal']:
                            if hasattr(result, attr):
                                audio_data = getattr(result, attr)
                                print(f"   Found {attr}: {type(audio_data)}")
                                if isinstance(audio_data, np.ndarray):
                                    audio_chunks.extend(audio_data.flatten())
                                    break
                                elif isinstance(audio_data, (int, float)):
                                    audio_chunks.append(float(audio_data))
                                    break
                except Exception as e:
                    print(f"Warning: Could not extract audio from {type(result)}: {e}")
        
        if audio_chunks:
            # Convert to numpy array
            final_audio = np.array(audio_chunks, dtype=np.float32)
            print(f"🎵 Generated audio with {len(final_audio)} samples")
            
            # Apply speaking rate adjustment if needed
            if ${speakingRate} != 1.0:
                print(f"📈 Adjusting speaking rate: ${speakingRate}x")
                # Simple time-stretch for rate adjustment
                from scipy.signal import resample
                new_length = int(len(final_audio) / ${speakingRate})
                final_audio = resample(final_audio, new_length)
            
            # Save to file
            print(f"💾 Saving audio to: ${outputPath}")
            sf.write("${outputPath}", final_audio, 22050)
            
            print("✅ Kokoro TTS generation completed successfully")
        else:
            raise Exception("No audio data generated")
            
except ImportError as e:
    print(f"❌ Error: Kokoro TTS not installed. Run: pip install kokoro>=0.9.2 soundfile")
    print(f"Details: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error during Kokoro TTS generation: {e}")
    sys.exit(1)

if __name__ == "__main__":
    main()
`;
    }

    /**
     * Run Kokoro TTS Python script
     */
    private async runKokoroCommand(pythonScriptPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`🚀 Kokoro TTS: Executing Python script...`);

            const kokoroProcess = spawn(this.pythonPath, [pythonScriptPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            kokoroProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                // Show progress
                if (output.includes('🎤') || output.includes('🔊') || output.includes('💾') || output.includes('✅')) {
                    process.stdout.write(output);
                }
            });

            kokoroProcess.stderr.on('data', (data) => {
                const error = data.toString();
                stderr += error;
                // Only show non-warning errors
                if (!error.includes('Warning') && !error.includes('warning')) {
                    console.log('Kokoro:', error.trim());
                }
            });

            kokoroProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Kokoro TTS generation completed successfully');
                    resolve();
                } else {
                    console.error(`❌ Kokoro TTS process failed with code ${code}`);
                    if (stderr.trim()) {
                        console.error('Error details:', stderr.trim());
                    }
                    reject(new Error(`Kokoro TTS process failed: ${stderr || 'Unknown error'}`));
                }
            });

            kokoroProcess.on('error', (error) => {
                console.error('❌ Failed to start Kokoro TTS process:', error);
                reject(new Error(`Failed to start Kokoro TTS process: ${error.message}`));
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
     * Handles WAV files by stripping headers from all but the first segment
     */
    combineAudioSegments(audioSegments: AudioSegment[]): Buffer {
        console.log(`🔗 Combining ${audioSegments.length} audio segments...`);

        // DETAILED DEBUGGING: Log each segment being combined
        console.log(`🔍 DEBUGGING: Segments being combined:`);
        audioSegments.forEach((segment, index) => {
            console.log(`   • Segment ${index + 1}: "${segment.metadata.sectionTitle}"`);
            console.log(`     - Type: ${segment.metadata.type}`);
            console.log(`     - Buffer size: ${(segment.buffer.length / 1024).toFixed(1)}KB`);
            console.log(`     - Is Placeholder: ${segment.metadata.isPlaceholder || false}`);
        });

        if (audioSegments.length === 0) {
            console.log('⚠️ No audio segments to combine');
            return Buffer.alloc(0);
        }

        if (audioSegments.length === 1) {
            console.log('✅ Single segment, returning as-is');
            return audioSegments[0].buffer;
        }

        // Check if segments are WAV files by looking for WAV header
        const audioBuffers: Buffer[] = [];

        audioSegments.forEach((segment, index) => {
            const buffer = segment.buffer;

            // Check if this is a WAV file (starts with "RIFF" and contains "WAVE")
            const isWavFile = buffer.length >= 12 &&
                buffer.subarray(0, 4).toString() === 'RIFF' &&
                buffer.subarray(8, 12).toString() === 'WAVE';

            if (isWavFile) {
                if (index === 0) {
                    // Keep the first WAV file with its header intact
                    console.log(`   📄 Segment ${index + 1}: Keeping WAV header (${buffer.length} bytes)`);
                    audioBuffers.push(buffer);
                } else {
                    // Strip WAV header from subsequent files (header is typically 44 bytes)
                    // Find the "data" chunk to get the actual audio data start
                    let dataStart = 44; // Default WAV header size

                    // Look for "data" chunk marker
                    for (let i = 12; i < buffer.length - 4; i++) {
                        if (buffer.subarray(i, i + 4).toString() === 'data') {
                            dataStart = i + 8; // Skip "data" + 4-byte size
                            break;
                        }
                    }

                    const audioData = buffer.subarray(dataStart);
                    console.log(`   🎵 Segment ${index + 1}: Stripped WAV header, keeping ${audioData.length} bytes of audio data`);
                    audioBuffers.push(audioData);
                }
            } else {
                // Not a WAV file, include as-is (might be raw PCM or silence)
                console.log(`   📦 Segment ${index + 1}: Non-WAV data (${buffer.length} bytes)`);
                audioBuffers.push(buffer);
            }
        });

        console.log(`🔗 Total buffers to combine: ${audioBuffers.length}`);
        console.log(`🔗 Individual buffer sizes:`, audioBuffers.map(buf => `${(buf.length / 1024).toFixed(1)}KB`));

        const combinedBuffer = Buffer.concat(audioBuffers);

        // Update the WAV header with the new file size if the first segment was a WAV file
        const firstBuffer = audioSegments[0].buffer;
        if (firstBuffer.length >= 12 &&
            firstBuffer.subarray(0, 4).toString() === 'RIFF' &&
            firstBuffer.subarray(8, 12).toString() === 'WAVE') {

            // Update RIFF chunk size (total file size - 8)
            const totalSize = combinedBuffer.length - 8;
            combinedBuffer.writeUInt32LE(totalSize, 4);

            // Find and update data chunk size
            for (let i = 12; i < Math.min(combinedBuffer.length - 8, 100); i++) {
                if (combinedBuffer.subarray(i, i + 4).toString() === 'data') {
                    const dataSize = combinedBuffer.length - (i + 8);
                    combinedBuffer.writeUInt32LE(dataSize, i + 4);
                    console.log(`📝 Updated WAV header: total size ${totalSize}, data size ${dataSize}`);
                    break;
                }
            }
        }

        console.log(`✅ Combined audio: ${(combinedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        console.log(`🔍 DEBUGGING: Combined buffer size: ${combinedBuffer.length} bytes`);

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