import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

// Types for subtitle video processing
export interface SubtitleSegment {
    text: string;
    startTime: number; // in seconds
    endTime: number; // in seconds
    sectionTitle: string;
    index: number;
}

export interface SubtitleVideoOptions {
    width: number;
    height: number;
    fps: number;
    backgroundColor: string;
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    maxWordsPerLine: number;
    lineSpacing: number;
    quality: 'low' | 'medium' | 'high';
}

export class SubtitleVideoProcessor {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(tmpdir(), 'youtube-automation-subtitle-processing');
        this.ensureTempDir();
    }

    private async ensureTempDir(): Promise<void> {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create temp directory:', error);
        }
    }

    /**
     * Get default subtitle video options - MAXIMUM SPEED
     */
    static getDefaultOptions(): SubtitleVideoOptions {
        return {
            width: 854, // Much smaller - 480p wide
            height: 480,
            fps: 6, // Very low FPS for text
            backgroundColor: '#000000', // Simple black
            fontFamily: 'Arial',
            fontSize: 16, // Much smaller font as requested
            fontColor: 'white',
            maxWordsPerLine: 10,
            lineSpacing: 1.2,
            quality: 'medium'
        };
    }

    /**
     * Calculate timing for subtitle segments - OPTIMIZED FOR SHORT READABLE CHUNKS
     */
    calculateSubtitleTiming(
        sections: Array<{ content: string; title: string; orderIndex: number }>,
        totalAudioDuration: number
    ): SubtitleSegment[] {
        const sortedSections = sections.sort((a, b) => a.orderIndex - b.orderIndex);
        const subtitleSegments: SubtitleSegment[] = [];

        const totalWords = sortedSections.reduce((sum, section) => {
            return sum + this.countWords(section.content);
        }, 0);

        let currentTime = 0;
        const pauseBetweenSections = 0.3; // Shorter pauses

        for (let i = 0; i < sortedSections.length; i++) {
            const section = sortedSections[i];
            const words = this.countWords(section.content);
            const sectionDuration = (words / totalWords) * totalAudioDuration;

            // Split into 1-2 sentences max for better readability
            const chunks = this.splitIntoSentenceChunks(section.content, 2); // Max 2 sentences
            const chunkDuration = sectionDuration / chunks.length;

            for (let j = 0; j < chunks.length; j++) {
                const startTime = currentTime + (j * chunkDuration);
                const endTime = Math.min(startTime + chunkDuration, currentTime + sectionDuration);

                subtitleSegments.push({
                    text: chunks[j].trim(),
                    startTime,
                    endTime,
                    sectionTitle: section.title,
                    index: subtitleSegments.length
                });
            }

            currentTime += sectionDuration;
            if (i < sortedSections.length - 1) {
                currentTime += pauseBetweenSections;
            }
        }

        console.log(`📝 Generated ${subtitleSegments.length} subtitle segments (1-2 sentences each)`);
        return subtitleSegments;
    }

    /**
     * Split text into 1-2 sentence chunks for better readability
     */
    private splitIntoSentenceChunks(text: string, maxSentencesPerChunk: number): string[] {
        // Split by sentence endings
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks: string[] = [];

        for (let i = 0; i < sentences.length; i += maxSentencesPerChunk) {
            const chunk = sentences.slice(i, i + maxSentencesPerChunk)
                .join(' ')
                .trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }
        }

        // If no sentence endings found, fall back to word-based chunking (but shorter)
        if (chunks.length === 0) {
            return this.splitTextIntoChunks(text, 10); // Much shorter fallback
        }

        return chunks;
    }

    /**
     * Split text into manageable chunks for subtitles (fallback method)
     */
    private splitTextIntoChunks(text: string, maxWordsPerChunk: number): string[] {
        const words = text.trim().split(/\s+/);
        const chunks: string[] = [];

        for (let i = 0; i < words.length; i += maxWordsPerChunk) {
            const chunk = words.slice(i, i + maxWordsPerChunk).join(' ');
            chunks.push(chunk);
        }

        return chunks.filter(chunk => chunk.length > 0);
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        return text.trim().split(/\s+/).length;
    }

    /**
     * Create subtitle video - SIMPLE AUDIO ONLY APPROACH
     */
    async createSubtitleVideo(
        subtitleSegments: SubtitleSegment[],
        audioUrl: string,
        options: SubtitleVideoOptions,
        customText: string = 'AUDIO'
    ): Promise<Buffer> {
        const outputPath = path.join(this.tempDir, `audio_only_${Date.now()}.mp4`);

        try {
            console.log(`🚀 SUPER SIMPLE: Creating "${customText}" video`);

            // Create simple audio-only video with custom text
            await this.createAudioOnlyVideo(audioUrl, outputPath, options, customText);

            const outputBuffer = await fs.readFile(outputPath);
            await this.cleanup([outputPath]);

            return outputBuffer;

        } catch (error) {
            try {
                await this.cleanup([outputPath]);
            } catch (cleanupError) {
                console.error('❌ Cleanup error:', cleanupError);
            }
            throw error;
        }
    }

    /**
     * Create simple audio-only video with custom text
     */
    private async createAudioOnlyVideo(
        audioUrl: string,
        outputPath: string,
        options: SubtitleVideoOptions,
        customText: string = 'AUDIO'
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`⚡ CREATING: Simple "${customText}" video...`);

            // Handle local storage URLs by converting to file path
            let audioFilePath = audioUrl;

            // If it's a local storage URL, convert to actual file path
            if (audioUrl.startsWith('/api/local-files/')) {
                const relativePath = audioUrl.replace('/api/local-files/', '');
                audioFilePath = path.join(process.cwd(), 'public', 'uploads', relativePath);
            }

            // Properly escape text for FFmpeg drawtext filter
            // Replace quotes and escape special characters
            const escapedText = customText
                .replace(/\\/g, '\\\\')  // Escape backslashes first
                .replace(/"/g, '\\"')    // Escape double quotes
                .replace(/'/g, "\\'")    // Escape single quotes
                .replace(/:/g, '\\:')    // Escape colons
                .replace(/=/g, '\\=')    // Escape equals signs
                .replace(/,/g, '\\,')    // Escape commas
                .replace(/\[/g, '\\[')   // Escape square brackets
                .replace(/\]/g, '\\]')   // Escape square brackets
                .replace(/\(/g, '\\(')   // Escape parentheses
                .replace(/\)/g, '\\)');  // Escape parentheses

            const command = ffmpeg()
                .input(`color=c=${options.backgroundColor}:s=${options.width}x${options.height}:r=${options.fps}`)
                .inputOptions(['-f', 'lavfi'])
                .input(audioFilePath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-map', '0:v:0',
                    '-map', '1:a:0',
                    '-shortest',
                    '-preset', 'ultrafast',
                    '-crf', '30',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    '-vf', `drawtext=text='${escapedText}':fontsize=${options.fontSize}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
                    '-threads', '0',
                    '-tune', 'fastdecode',
                    '-profile:v', 'baseline'
                ]);

            let lastProgressTime = 0;

            command
                .on('start', (commandLine) => {
                    console.log(`🚀 ${customText.toUpperCase()}: Processing started`);
                })
                .on('progress', (progress) => {
                    const now = Date.now();
                    if (now - lastProgressTime > 5000) {
                        lastProgressTime = now;
                        console.log(`⚡ ${customText.toUpperCase()}: ${progress.timemark || 'processing...'}`);
                    }
                })
                .on('end', () => {
                    console.log(`✅ ${customText.toUpperCase()} video completed!`);
                    resolve();
                })
                .on('error', (err) => {
                    console.error(`❌ ${customText} error:`, err);
                    reject(new Error(`${customText} processing failed: ${err.message}`));
                })
                .save(outputPath);
        });
    }

    /**
     * Cleanup temporary files
     */
    private async cleanup(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }

    /**
     * Get audio duration using FFmpeg
     */
    async getAudioDuration(audioUrl: string): Promise<number> {
        return new Promise((resolve, reject) => {
            // Handle local storage URLs by converting to file path
            let filePath = audioUrl;

            // If it's a local storage URL, convert to actual file path
            if (audioUrl.startsWith('/api/local-files/')) {
                const relativePath = audioUrl.replace('/api/local-files/', '');
                filePath = path.join(process.cwd(), 'public', 'uploads', relativePath);
            }

            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to get audio duration: ${err.message}`));
                    return;
                }

                const duration = metadata.format.duration;
                if (!duration) {
                    reject(new Error('Could not determine audio duration'));
                    return;
                }

                resolve(duration);
            });
        });
    }
}

// Export singleton instance
export const subtitleVideoProcessor = new SubtitleVideoProcessor(); 