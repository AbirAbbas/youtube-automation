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
     * Get audio duration from Cloudinary URL
     */
    async getAudioDuration(audioUrl: string): Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(audioUrl, (err, metadata) => {
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

    /**
     * Download and prepare video segments
     */
    async prepareVideoSegments(
        selectedVideos: SelectedVideo[],
        targetDuration: number
    ): Promise<VideoSegment[]> {
        const segments: VideoSegment[] = [];
        let totalDuration = 0;
        let segmentIndex = 0;

        // Sort videos by duration (longer first) to minimize transitions and gaps
        const sortedVideos = [...selectedVideos].sort((a, b) => b.duration - a.duration);

        console.log(`🎯 Preparing segments for ${targetDuration}s from ${sortedVideos.length} videos`);

        for (const video of sortedVideos) {
            if (totalDuration >= targetDuration) break;

            try {
                // Download video
                console.log(`📥 Downloading video ${video.id}...`);
                const response = await fetch(video.url);
                if (!response.ok) {
                    throw new Error(`Failed to download video: ${response.statusText}`);
                }

                const buffer = Buffer.from(await response.arrayBuffer());
                const filename = `segment_${segmentIndex}_${video.id}.mp4`;
                const filePath = path.join(this.tempDir, filename);

                // Save to temp file
                await fs.writeFile(filePath, buffer);

                // Verify actual video duration to catch mismatches
                const actualDuration = await this.getVideoDuration(filePath);
                console.log(`Video ${video.id}: reported ${video.duration}s, actual ${actualDuration}s`);

                // Calculate how much of this video we should use
                const remainingDuration = targetDuration - totalDuration;

                // Use the full clip if it fits, otherwise trim to fit exactly
                const useDuration = Math.min(actualDuration, remainingDuration);

                segments.push({
                    buffer,
                    duration: useDuration,
                    filename: filePath,
                    metadata: {
                        width: video.width,
                        height: video.height,
                        quality: video.quality,
                        fps: video.fps,
                        source: 'pexels',
                        tags: video.tags,
                        actualDuration, // Store actual duration for processing
                        requiredDuration: useDuration
                    }
                });

                totalDuration += useDuration;
                segmentIndex++;

                console.log(`✅ Prepared segment ${segmentIndex}: ${useDuration}s (actual: ${actualDuration}s, total: ${totalDuration}s)`);

            } catch (error) {
                console.error(`❌ Error processing video ${video.id}:`, error);
                continue;
            }
        }

        // Enhanced validation and feedback
        if (totalDuration < targetDuration) {
            const shortfall = targetDuration - totalDuration;
            console.warn(`⚠️ Shortfall detected: ${shortfall.toFixed(2)}s missing (${totalDuration}s/${targetDuration}s)`);

            // Only proceed if we have at least 80% coverage
            if (totalDuration < targetDuration * 0.8) {
                throw new Error(`Insufficient video content: only ${totalDuration.toFixed(1)}s available for ${targetDuration}s target (need at least ${(targetDuration * 0.8).toFixed(1)}s)`);
            }
        }

        return segments;
    }

    /**
     * Create video from segments and audio
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
            // Create concat list for FFmpeg
            await this.createConcatList(segments, concatListPath, options.targetDuration);

            // Process video with FFmpeg
            await this.processWithFFmpeg(concatListPath, audioUrl, outputPath, options);

            // Read the output file
            const outputBuffer = await fs.readFile(outputPath);

            // Cleanup
            await this.cleanup([outputPath, concatListPath, ...segments.map(s => s.filename)]);

            return outputBuffer;

        } catch (error) {
            // Cleanup on error
            try {
                await this.cleanup([outputPath, concatListPath, ...segments.map(s => s.filename)]);
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
            throw error;
        }
    }

    /**
     * Create FFmpeg concat list file with seamless transitions
     */
    private async createConcatList(
        segments: VideoSegment[],
        listPath: string,
        targetDuration: number
    ): Promise<void> {
        let totalDuration = 0;
        const lines: string[] = [];

        console.log(`🎯 Creating seamless video sequence: ${targetDuration}s target from ${segments.length} segments`);

        // First pass: use segments in their optimal durations
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const remainingDuration = targetDuration - totalDuration;

            if (remainingDuration <= 0) break;

            // Use the minimum of what we need and what the clip provides
            const useDuration = Math.min(segment.metadata.actualDuration || segment.duration, remainingDuration);

            // Only use clips that contribute meaningfully (at least 2 seconds)
            if (useDuration >= 2) {
                const normalizedPath = await this.normalizeSegment(segment, useDuration, false); // No looping in first pass
                lines.push(`file '${normalizedPath}'`);
                totalDuration += useDuration;

                console.log(`📹 Segment ${i + 1}: ${useDuration.toFixed(1)}s (${totalDuration.toFixed(1)}s/${targetDuration}s)`);
            }
        }

        // Second pass: handle any remaining duration intelligently
        if (totalDuration < targetDuration) {
            const shortfall = targetDuration - totalDuration;
            console.log(`🔄 Handling ${shortfall.toFixed(2)}s shortfall...`);

            if (shortfall > 0 && segments.length > 0) {
                // Find the longest remaining unused portion of clips
                const extendableSegments = segments
                    .map((segment, index) => ({
                        segment,
                        index,
                        remainingDuration: (segment.metadata.actualDuration || segment.duration) -
                            Math.min(segment.metadata.actualDuration || segment.duration, targetDuration / segments.length)
                    }))
                    .filter(item => item.remainingDuration > 2) // Only segments with meaningful remaining content
                    .sort((a, b) => b.remainingDuration - a.remainingDuration);

                for (const { segment } of extendableSegments) {
                    if (totalDuration >= targetDuration) break;

                    const stillNeeded = targetDuration - totalDuration;
                    const canProvide = segment.metadata.actualDuration || segment.duration;
                    const useDuration = Math.min(canProvide, stillNeeded);

                    if (useDuration >= 2) {
                        const normalizedPath = await this.normalizeSegment(segment, useDuration, false);
                        lines.push(`file '${normalizedPath}'`);
                        totalDuration += useDuration;

                        console.log(`📹 Extended segment: ${useDuration.toFixed(1)}s (total: ${totalDuration.toFixed(1)}s)`);
                    }
                }
            }
        }

        // Final check: if we're still short and have exhausted unique content, extend the last segment slightly
        if (totalDuration < targetDuration && segments.length > 0) {
            const finalShortfall = targetDuration - totalDuration;
            if (finalShortfall <= 5) { // Only for small gaps (5 seconds or less)
                const lastSegment = segments[segments.length - 1];
                console.log(`🔧 Final adjustment: extending last segment by ${finalShortfall.toFixed(2)}s`);

                const extendedPath = await this.normalizeSegment(lastSegment, finalShortfall, true); // Allow minimal looping only here
                lines.push(`file '${extendedPath}'`);
                totalDuration += finalShortfall;
            }
        }

        console.log(`✅ Final sequence: ${totalDuration.toFixed(1)}s (target: ${targetDuration}s)`);

        if (lines.length === 0) {
            throw new Error('No valid video segments created');
        }

        await fs.writeFile(listPath, lines.join('\n'));
    }

    /**
     * Normalize video segment with improved handling to avoid freeze frames
     */
    private async normalizeSegment(segment: VideoSegment, duration: number, allowLooping: boolean = false): Promise<string> {
        const normalizedPath = segment.filename.replace('.mp4', `_normalized_${Date.now()}.mp4`);
        const actualDuration = segment.metadata.actualDuration || segment.duration;

        return new Promise((resolve, reject) => {
            console.log(`🔧 Normalizing: ${path.basename(segment.filename)} for ${duration}s (actual: ${actualDuration}s, looping: ${allowLooping})`);

            let ffmpegCommand = ffmpeg(segment.filename);

            if (actualDuration < duration && allowLooping) {
                // Only loop if explicitly allowed and needed
                const loopCount = Math.ceil(duration / actualDuration);
                console.log(`🔄 Looping ${loopCount} times to fill ${duration}s`);

                ffmpegCommand = ffmpegCommand
                    .inputOptions(['-stream_loop', (loopCount - 1).toString()])
                    .outputOptions([
                        '-t', duration.toString(),
                        '-c:v', 'libx264', // Re-encode to ensure smooth transitions
                        '-c:a', 'aac',
                        '-preset', 'fast',
                        '-crf', '26'
                    ]);
            } else {
                // Trim or use as-is, prioritizing smooth playback
                const useDuration = Math.min(actualDuration, duration);
                console.log(`✂️ Using ${useDuration}s of ${actualDuration}s available`);

                ffmpegCommand = ffmpegCommand
                    .outputOptions([
                        '-t', useDuration.toString(),
                        '-c:v', 'libx264', // Re-encode for consistency
                        '-c:a', 'aac',
                        '-preset', 'fast',
                        '-crf', '26',
                        '-vsync', 'cfr' // Constant frame rate for smooth playback
                    ]);
            }

            ffmpegCommand
                .on('end', () => {
                    console.log(`✅ Normalized: ${path.basename(normalizedPath)}`);
                    resolve(normalizedPath);
                })
                .on('error', (err) => {
                    console.error(`❌ Error normalizing segment:`, err);
                    reject(err);
                })
                .save(normalizedPath);
        });
    }

    /**
     * Process video with FFmpeg
     */
    private async processWithFFmpeg(
        concatListPath: string,
        audioUrl: string,
        outputPath: string,
        options: ProcessingOptions
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('🎬 Starting video processing with FFmpeg...');
            console.log(`Target duration: ${options.targetDuration}s`);

            let startTime = Date.now();
            let lastProgressTime = 0;

            ffmpeg()
                .input(concatListPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .input(audioUrl)
                .videoCodec(options.videoCodec || 'libx264')
                .audioCodec(options.audioCodec || 'aac')
                .size(`${options.outputWidth || 1920}x${options.outputHeight || 1080}`)
                .fps(options.fps || 30)
                // Add video filters for aspect ratio and scaling normalization
                .videoFilters([
                    'scale=1920:1080:force_original_aspect_ratio=increase',
                    'crop=1920:1080',
                    'setsar=1'
                ])
                // Remove .duration() restriction - let it match the audio length naturally
                .outputOptions([
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    // Use audio as the timing reference - video will match audio length
                    '-map', '0:v:0', // Map video from concat
                    '-map', '1:a:0', // Map audio from audio file
                    '-preset', this.getPresetForQuality(options.quality || 'medium'),
                    '-crf', this.getCRFForQuality(options.quality || 'medium'),
                    '-b:v', this.getBitrateForQuality(options.quality || 'medium'),
                    '-maxrate', this.getBitrateForQuality(options.quality || 'medium'),
                    '-bufsize', '2M',
                    '-b:a', '128k',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    '-profile:v', 'high',
                    '-level', '4.0',
                    '-vsync', 'cfr',
                    '-r', (options.fps || 30).toString()
                ])
                .on('start', (commandLine) => {
                    console.log('FFmpeg command:', commandLine);
                })
                .on('progress', (progress) => {
                    const now = Date.now();
                    // Only log progress every 2 seconds to avoid spam
                    if (now - lastProgressTime > 2000) {
                        lastProgressTime = now;

                        if (progress.timemark && options.targetDuration) {
                            // Calculate progress based on timemark vs target duration
                            const timeParts = progress.timemark.split(':');
                            const currentSeconds = parseInt(timeParts[0]) * 3600 +
                                parseInt(timeParts[1]) * 60 +
                                parseFloat(timeParts[2]);
                            const progressPercent = Math.min(Math.round((currentSeconds / options.targetDuration) * 100), 100);
                            console.log(`Processing: ${progressPercent}% (${currentSeconds.toFixed(1)}s/${options.targetDuration}s)`);
                        } else if (progress.percent) {
                            // Fallback to FFmpeg's percent, but clamp it
                            const clampedPercent = Math.min(Math.max(Math.round(progress.percent), 0), 100);
                            console.log(`Processing: ${clampedPercent}%`);
                        }
                    }
                })
                .on('end', () => {
                    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`✅ Video processing completed successfully in ${processingTime}s`);
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
     * Get actual video duration using FFprobe
     */
    private async getVideoDuration(filePath: string): Promise<number> {
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
     * Get FFmpeg preset based on quality
     */
    private getPresetForQuality(quality: 'low' | 'medium' | 'high'): string {
        switch (quality) {
            case 'low': return 'fast';
            case 'medium': return 'medium';
            case 'high': return 'slow';
            default: return 'medium';
        }
    }

    /**
     * Get CRF value based on quality (lower = better quality, higher file size)
     */
    private getCRFForQuality(quality: 'low' | 'medium' | 'high'): string {
        switch (quality) {
            case 'low': return '30';      // More compression, smaller file
            case 'medium': return '26';   // Balanced
            case 'high': return '23';     // Less compression, larger file
            default: return '26';
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
     * Get processing options with defaults
     */
    static getDefaultOptions(targetDuration: number): ProcessingOptions {
        return {
            targetDuration,
            outputWidth: 1920,
            outputHeight: 1080,
            fps: 30,
            quality: 'medium',
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