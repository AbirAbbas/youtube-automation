import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { SelectedVideo } from './pexels';

// Types for video processing
export interface VideoSegment {
    buffer: Buffer;
    duration: number;
    filename: string;
    metadata: {
        width: number;
        height: number;
        quality: string;
        fps: number; // Add frame rate to metadata
        source: 'pexels' | 'custom';
        tags: string[];
        actualDuration?: number; // Store actual duration from source
        requiredDuration: number; // Duration to use for processing
    };
}

export interface ProcessingOptions {
    targetDuration: number;
    actualAudioDuration?: number; // Actual audio duration for accurate progress tracking
    outputWidth?: number;
    outputHeight?: number;
    fps?: number;
    quality?: 'low' | 'medium' | 'high';
    audioCodec?: string;
    videoCodec?: string;
}

export interface AudioInfo {
    duration: number;
    url: string;
}

export class VideoProcessor {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(tmpdir(), 'youtube-automation-video-processing');
        this.ensureTempDir();
    }

    /**
     * Ensure temp directory exists
     */
    private async ensureTempDir(): Promise<void> {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('Error creating temp directory:', error);
        }
    }

    /**
     * Get actual video duration using FFprobe
     */
    async getVideoDuration(filePath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to probe video duration: ${err.message}`));
                    return;
                }

                const duration = metadata.format.duration;
                if (!duration) {
                    reject(new Error('Could not determine video duration'));
                    return;
                }

                resolve(duration);
            });
        });
    }

    /**
     * Get audio duration using FFprobe
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
                    reject(new Error(`Failed to probe audio duration: ${err.message}`));
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

    /**
     * Prepare video segments from selected videos - optimized with parallel downloads
     */
    async prepareVideoSegments(
        selectedVideos: SelectedVideo[],
        targetDuration: number
    ): Promise<VideoSegment[]> {
        console.log(`🚀 Downloading ${selectedVideos.length} video clips in parallel for ${targetDuration}s target`);

        // Download all videos in parallel for much faster processing
        const downloadPromises = selectedVideos.map(async (video, index) => {
            try {
                console.log(`📥 Starting download ${index + 1}/${selectedVideos.length}: video ${video.id} (${video.duration}s)...`);

                const response = await fetch(video.url);
                if (!response.ok) {
                    throw new Error(`Failed to download video: ${response.statusText}`);
                }

                const buffer = Buffer.from(await response.arrayBuffer());
                const filename = `segment_${index}_${video.id}.mp4`;
                const filePath = path.join(this.tempDir, filename);

                // Save to temp file
                await fs.writeFile(filePath, buffer);

                // Get actual duration for reference (this is still fast)
                const actualDuration = await this.getVideoDuration(filePath);
                console.log(`✅ Downloaded ${index + 1}/${selectedVideos.length}: video ${video.id} (${actualDuration}s actual)`);

                return {
                    buffer,
                    duration: video.duration, // Keep reported duration
                    filename: filePath,
                    metadata: {
                        width: video.width,
                        height: video.height,
                        quality: video.quality,
                        fps: video.fps,
                        source: 'pexels' as const,
                        tags: video.tags,
                        actualDuration, // Store actual for reference
                        requiredDuration: video.duration // Not used in new approach
                    }
                };

            } catch (error) {
                console.error(`❌ Error downloading video ${video.id}:`, error);
                return null; // Return null for failed downloads
            }
        });

        // Wait for all downloads to complete
        console.log(`⏳ Waiting for all ${selectedVideos.length} downloads to complete...`);
        const results = await Promise.allSettled(downloadPromises);

        // Filter out failed downloads
        const segments: VideoSegment[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value !== null) {
                segments.push(result.value);
            }
        }

        console.log(`✅ Successfully downloaded ${segments.length}/${selectedVideos.length} video clips (parallel processing)`);

        if (segments.length === 0) {
            throw new Error('No video segments could be downloaded');
        }

        return segments;
    }

    /**
     * Create video from segments and audio - preserve original quality
     */
    async createVideo(
        segments: VideoSegment[],
        audioUrl: string,
        options: ProcessingOptions
    ): Promise<Buffer> {
        if (segments.length === 0) {
            throw new Error('No video segments provided');
        }

        const outputPath = path.join(this.tempDir, `output_${Date.now()}.mp4`);
        const concatListPath = path.join(this.tempDir, `concat_${Date.now()}.txt`);

        try {
            console.log(`🎯 Creating video: ${segments.length} clips for ${options.targetDuration}s target (preserving original quality)`);

            // Create precise concat list 
            await this.createConcatList(segments, concatListPath, options.targetDuration);

            // Process with format preservation
            await this.processWithFFmpeg(concatListPath, audioUrl, outputPath, options);

            // Read the output file
            const outputBuffer = await fs.readFile(outputPath);

            // Cleanup temp files
            await this.cleanup([outputPath, concatListPath, ...segments.map(s => s.filename)]);

            return outputBuffer;

        } catch (error) {
            // Cleanup on error
            try {
                await this.cleanup([outputPath, concatListPath, ...segments.map(s => s.filename)]);
            } catch (cleanupError) {
                console.error('❌ Cleanup error:', cleanupError);
            }
            throw error;
        }
    }

    /**
     * Create FFmpeg concat list file with precise duration control
     */
    private async createConcatList(
        segments: VideoSegment[],
        listPath: string,
        targetDuration: number
    ): Promise<void> {
        let totalDuration = 0;
        const lines: string[] = [];

        console.log(`🎯 Creating video sequence: ${targetDuration}s target with precise timing`);

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const actualDuration = segment.metadata.actualDuration || segment.duration;
            const remainingDuration = targetDuration - totalDuration;

            // Stop if we're close enough to target
            if (remainingDuration <= 0.5) {
                console.log(`🛑 Close to target (${totalDuration.toFixed(1)}s), stopping`);
                break;
            }

            // Only add if we have meaningful time left
            if (remainingDuration >= 2) {
                console.log(`📹 Adding clip ${i + 1}: ${actualDuration}s (will total: ${(totalDuration + actualDuration).toFixed(1)}s)`);
                lines.push(`file '${segment.filename}'`);
                totalDuration += actualDuration;
            } else {
                console.log(`⏭️ Skipping clip ${i + 1}: only ${remainingDuration.toFixed(1)}s needed, clip is ${actualDuration}s`);
                break;
            }
        }

        console.log(`✅ Concat list: ${lines.length} clips, ${totalDuration.toFixed(1)}s total`);

        if (lines.length === 0) {
            throw new Error('No video clips available');
        }

        await fs.writeFile(listPath, lines.join('\n'));
    }

    /**
     * Process video with FFmpeg - optimized for speed
     */
    private async processWithFFmpeg(
        concatListPath: string,
        audioUrl: string,
        outputPath: string,
        options: ProcessingOptions
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('🎬 Processing with speed-optimized settings...');
            console.log(`📊 Target duration: ${options.targetDuration}s, Quality: ${options.quality}`);

            // Handle local storage URLs by converting to file path
            let audioFilePath = audioUrl;

            // If it's a local storage URL, convert to actual file path
            if (audioUrl.startsWith('/api/local-files/')) {
                const relativePath = audioUrl.replace('/api/local-files/', '');
                audioFilePath = path.join(process.cwd(), 'public', 'uploads', relativePath);
            }

            let lastProgressTime = 0;

            // Get optimized settings based on quality preference
            const preset = this.getOptimizedPreset(options.quality || 'medium');
            const crf = this.getOptimizedCRF(options.quality || 'medium');
            const useSimpleScaling = (options.quality === 'low');

            const command = ffmpeg()
                .input(concatListPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .input(audioFilePath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .size('1920x1080');

            // Use simpler scaling for low quality (much faster)
            if (useSimpleScaling) {
                command.videoFilters(['scale=1920:1080:force_original_aspect_ratio=decrease']);
            } else {
                // More precise scaling for medium/high quality
                command.videoFilters(['scale=1920:1080:force_original_aspect_ratio=decrease:eval=frame,pad=1920:1080:(ow-iw)/2:(oh-ih)/2']);
            }

            command.outputOptions([
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-map', '0:v:0', // Video from concat
                '-map', '1:a:0', // Audio from audio file
                '-shortest', // Let audio control timing
                '-preset', preset, // Speed-optimized preset
                '-crf', crf.toString(), // Quality-optimized CRF
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-threads', '0', // Use all available cores
                '-avoid_negative_ts', 'make_zero',
                '-copyts', // Preserve timestamps
                '-start_at_zero' // Start at zero
            ]);

            command
                .on('start', (commandLine) => {
                    console.log('🚀 FFmpeg (optimized):', commandLine);
                })
                .on('progress', (progress) => {
                    const now = Date.now();
                    if (now - lastProgressTime > 3000) { // More frequent progress updates
                        lastProgressTime = now;

                        if (progress.timemark && progress.timemark.includes(':')) {
                            try {
                                const timeParts = progress.timemark.split(':');
                                if (timeParts.length === 3) {
                                    const currentSeconds =
                                        parseInt(timeParts[0]) * 3600 +
                                        parseInt(timeParts[1]) * 60 +
                                        parseFloat(timeParts[2]);

                                    const progressPercent = Math.min(
                                        Math.round((currentSeconds / options.targetDuration) * 100),
                                        100
                                    );

                                    console.log(`⚡ Processing: ${progressPercent}% (${currentSeconds.toFixed(1)}s/${options.targetDuration.toFixed(1)}s) [${preset}]`);
                                }
                            } catch (error) {
                                console.log(`⚡ Processing... ${progress.timemark} [${preset}]`);
                            }
                        } else {
                            console.log(`⚡ Processing... [${preset}]`);
                        }
                    }
                })
                .on('end', () => {
                    console.log('✅ Video processing completed!');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('❌ FFmpeg error:', err);
                    reject(new Error(`Video processing failed: ${err.message}`));
                })
                .save(outputPath);
        });
    }

    /**
     * Get optimized FFmpeg preset for performance
     */
    private getOptimizedPreset(quality: 'low' | 'medium' | 'high'): string {
        switch (quality) {
            case 'low': return 'ultrafast';     // ~10x faster than medium
            case 'medium': return 'fast';       // ~3x faster than medium  
            case 'high': return 'medium';       // Original balanced setting
            default: return 'fast';
        }
    }

    /**
     * Get optimized CRF value for speed vs quality balance
     */
    private getOptimizedCRF(quality: 'low' | 'medium' | 'high'): number {
        switch (quality) {
            case 'low': return 28;      // Much faster encoding, still decent quality
            case 'medium': return 25;   // Balanced speed and quality
            case 'high': return 20;     // Original high-quality setting
            default: return 25;
        }
    }



    /**
     * Get video bitrate based on quality
     */
    private getBitrateForQuality(quality: 'low' | 'medium' | 'high'): string {
        switch (quality) {
            case 'low': return '1M';      // 1 Mbps
            case 'medium': return '2M';   // 2 Mbps  
            case 'high': return '4M';     // 4 Mbps
            default: return '2M';
        }
    }

    /**
     * Clean up temporary files
     */
    private async cleanup(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                // Ignore errors - file might not exist
            }
        }
    }

    /**
     * Get processing options with defaults - optimized for speed by default
     */
    static getDefaultOptions(targetDuration: number): ProcessingOptions {
        return {
            targetDuration,
            outputWidth: 1920,
            outputHeight: 1080,
            // fps: 30, // REMOVED: Let source frame rates be preserved
            quality: 'low', // Changed from 'medium' to 'low' for faster processing by default
            audioCodec: 'aac',
            videoCodec: 'libx264'
        };
    }

    /**
     * Parse duration string to seconds
     */
    static parseDuration(durationStr: string): number {
        // Handle formats like "5 minutes", "2:30", "150 seconds"
        const cleanStr = durationStr.toLowerCase().trim();

        if (cleanStr.includes('minute')) {
            const minutes = parseFloat(cleanStr.replace(/[^\d.]/g, ''));
            return minutes * 60;
        }

        if (cleanStr.includes('second')) {
            return parseFloat(cleanStr.replace(/[^\d.]/g, ''));
        }

        if (cleanStr.includes(':')) {
            const parts = cleanStr.split(':');
            const minutes = parseInt(parts[0], 10) || 0;
            const seconds = parseInt(parts[1], 10) || 0;
            return minutes * 60 + seconds;
        }

        // Default: assume it's seconds
        const parsed = parseFloat(cleanStr.replace(/[^\d.]/g, ''));
        return isNaN(parsed) ? 300 : parsed; // Default 5 minutes
    }
}

// Export default instance
export const videoProcessor = new VideoProcessor(); 