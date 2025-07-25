import { createClient } from 'pexels';

// Types for Pexels API
export interface PexelsVideo {
    id: number;
    width: number;
    height: number;
    duration: number;
    full_res?: string;
    tags: string[];
    url: string;
    image: string;
    avg_color?: string;
    user: {
        id: number;
        name: string;
        url: string;
    };
    video_files: {
        id: number;
        quality: string | null;
        file_type: string;
        width: number;
        height: number;
        fps: number;
        link: string;
    }[];
    video_pictures: {
        id: number;
        picture: string;
        nr: number;
    }[];
}

export interface PexelsSearchResult {
    total_results: number;
    page: number;
    per_page: number;
    videos: PexelsVideo[];
    next_page?: string;
    prev_page?: string;
}

export interface VideoSearchParams {
    query: string;
    orientation?: 'landscape' | 'portrait' | 'square';
    size?: 'large' | 'medium' | 'small';
    color?: string;
    locale?: string;
    page?: number;
    per_page?: number;
}

export interface SelectedVideo {
    id: number;
    url: string;
    duration: number;
    quality: string;
    width: number;
    height: number;
    fps: number; // Add frame rate information
    tags: string[];
}

class PexelsService {
    private client: any;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Pexels API key is required');
        }
        this.client = createClient(apiKey);
    }

    /**
     * Search for videos on Pexels
     */
    async searchVideos(params: VideoSearchParams): Promise<PexelsSearchResult> {
        try {
            const result = await this.client.videos.search({
                query: params.query,
                orientation: params.orientation || 'landscape',
                size: params.size || 'medium',
                color: params.color,
                locale: params.locale || 'en-US',
                page: params.page || 1,
                per_page: params.per_page || 15,
            });

            return result as PexelsSearchResult;
        } catch (error) {
            console.error('Error searching Pexels videos:', error);
            throw new Error(`Failed to search videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get keywords from script content for video search
     */
    extractKeywords(content: string): string[] {
        // Remove common words and extract meaningful keywords
        const commonWords = new Set([
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an'
        ]);

        const words = content
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word));

        // Return unique keywords, prioritizing longer words
        return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 10);
    }

    /**
     * Find appropriate videos for script sections - relaxed filtering for better availability
     */
    async findVideosForScript(
        sections: Array<{ title: string; content: string; estimatedDuration: string }>,
        totalDurationNeeded: number
    ): Promise<SelectedVideo[]> {
        const selectedVideos: SelectedVideo[] = [];
        let totalSelectedDuration = 0;
        const minClipDuration = 3; // Reduced from 8 to allow shorter clips
        const maxClipDuration = 45; // Increased from 30 to allow longer clips
        const targetBuffer = 1.15; // Reduced from 1.3 - less strict buffer requirement

        console.log(`🎯 Target duration: ${totalDurationNeeded}s, gathering quality clips with relaxed filters`);

        // For each section, find relevant videos with relaxed quality filtering
        for (const section of sections) {
            const keywords = this.extractKeywords(`${section.title} ${section.content}`);

            // Search with more keywords and relaxed constraints
            for (const keyword of keywords.slice(0, 6)) { // Increased from 4 to 6 keywords
                try {
                    const searchResult = await this.searchVideos({
                        query: keyword,
                        orientation: 'landscape',
                        size: 'medium', // Changed from 'large' to 'medium' for broader selection
                        per_page: 20 // Increased from 15 to get more options
                    });

                    if (searchResult.videos.length > 0) {
                        // Relaxed filtering - prioritize availability over perfect quality
                        const suitableVideos = searchResult.videos.filter(v => {
                            // Duration filter - more lenient
                            if (v.duration < minClipDuration || v.duration > maxClipDuration) return false;

                            // Relaxed quality filter - accept any HD quality OR good SD quality
                            const hasGoodFile = v.video_files.some(file => {
                                // Accept HD quality
                                if (file.quality && (
                                    file.quality.includes('1080') ||
                                    file.quality.includes('720') ||
                                    file.quality.includes('hd')
                                )) {
                                    return true;
                                }

                                // Also accept good SD quality with reasonable resolution
                                if (file.width >= 640 && file.height >= 360) {
                                    return true;
                                }

                                return false;
                            });

                            return hasGoodFile;
                        });

                        // Take more videos per keyword for better coverage
                        for (let i = 0; i < Math.min(4, suitableVideos.length); i++) { // Increased from 2 to 4
                            const video = this.selectBestVideo([suitableVideos[i]]);
                            if (video && !selectedVideos.find(v => v.id === video.id)) {
                                selectedVideos.push(video);
                                totalSelectedDuration += video.duration;
                                console.log(`📹 Selected "${keyword}": ${video.duration}s (${video.quality}, ${video.fps}fps)`);

                                // Stop if we have enough
                                if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) {
                                    break;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error searching for keyword "${keyword}":`, error);
                    continue;
                }

                if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) {
                    break;
                }
            }

            if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) {
                break;
            }
        }

        // If we don't have enough content, add generic clips with even more relaxed standards
        if (totalSelectedDuration < totalDurationNeeded * targetBuffer) {
            console.log(`🔍 Need more content, searching for generic clips with relaxed standards...`);

            const genericTerms = ['business', 'technology', 'nature', 'lifestyle', 'modern', 'abstract', 'city', 'office'];

            for (const term of genericTerms) {
                if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) break;

                try {
                    const searchResult = await this.searchVideos({
                        query: term,
                        orientation: 'landscape',
                        size: 'medium',
                        per_page: 15
                    });

                    // Even more relaxed filtering for generic content
                    const suitableVideos = searchResult.videos.filter(v =>
                        v.duration >= minClipDuration &&
                        v.duration <= maxClipDuration &&
                        v.video_files.some(file =>
                            // Accept any reasonable quality video
                            file.file_type === 'video/mp4' &&
                            file.width >= 480 &&
                            file.height >= 270
                        )
                    );

                    for (let i = 0; i < Math.min(5, suitableVideos.length); i++) { // Take up to 5 generic clips
                        const video = this.selectBestVideo([suitableVideos[i]]);
                        if (video && !selectedVideos.find(v => v.id === video.id)) {
                            selectedVideos.push(video);
                            totalSelectedDuration += video.duration;
                            console.log(`📹 Added generic "${term}": ${video.duration}s (${video.quality}, ${video.fps}fps)`);

                            if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) break;
                        }
                    }
                } catch (error) {
                    console.error(`Error searching for generic term "${term}":`, error);
                }
            }
        }

        // Sort by duration (longer clips first for smoother experience)
        selectedVideos.sort((a, b) => b.duration - a.duration);

        const coverageRatio = totalSelectedDuration / totalDurationNeeded;
        console.log(`✅ Selected ${selectedVideos.length} videos with relaxed filtering: ${totalSelectedDuration}s (${coverageRatio.toFixed(2)}x coverage)`);

        return selectedVideos;
    }

    /**
     * Select the best video from search results based on quality and duration
     */
    private selectBestVideo(videos: PexelsVideo[]): SelectedVideo | null {
        if (videos.length === 0) return null;

        // Sort videos by quality score
        const scoredVideos = videos.map(video => ({
            video,
            score: this.getVideoQualityScore(video)
        })).sort((a, b) => b.score - a.score);

        const bestVideo = scoredVideos[0].video;

        // Get the best quality file with consistent standards
        const bestFile = bestVideo.video_files
            .filter(file => file.file_type === 'video/mp4')
            .sort((a, b) => {
                // First priority: prefer HD quality
                const getQualityScore = (quality: string | null) => {
                    if (!quality) return 0;
                    if (quality.includes('1080')) return 4;
                    if (quality.includes('720')) return 3;
                    if (quality.includes('480')) return 2;
                    return 1;
                };

                const qualityDiff = getQualityScore(b.quality) - getQualityScore(a.quality);
                if (qualityDiff !== 0) return qualityDiff;

                // Second priority: reasonable frame rates (avoid very high fps that might cause issues)
                const isGoodFpsA = a.fps >= 24 && a.fps <= 60;
                const isGoodFpsB = b.fps >= 24 && b.fps <= 60;

                if (isGoodFpsA && !isGoodFpsB) return -1;
                if (!isGoodFpsA && isGoodFpsB) return 1;

                // Third priority: prefer standard frame rates
                const isStandardFpsA = [24, 25, 30, 50, 60].includes(a.fps);
                const isStandardFpsB = [24, 25, 30, 50, 60].includes(b.fps);

                if (isStandardFpsA && !isStandardFpsB) return -1;
                if (!isStandardFpsA && isStandardFpsB) return 1;

                return 0;
            })[0];

        if (!bestFile) return null;

        return {
            id: bestVideo.id,
            url: bestFile.link,
            duration: bestVideo.duration,
            quality: bestFile.quality || 'unknown',
            width: bestFile.width,
            height: bestFile.height,
            fps: bestFile.fps,
            tags: bestVideo.tags
        };
    }

    /**
     * Score video duration - updated to strongly prefer longer clips and penalize very short ones
     */
    private getDurationScore(duration: number): number {
        if (duration >= 10 && duration <= 30) return 5; // Ideal range
        if (duration >= 5 && duration <= 45) return 4;  // Good range
        if (duration >= 3 && duration <= 60) return 3;  // Acceptable
        if (duration >= 2 && duration <= 90) return 2;  // Marginal
        if (duration >= 1) return 1;                    // Poor but usable
        return 0; // Too short to be useful
    }

    /**
     * Score video quality based on multiple factors - updated for relaxed standards
     */
    private getVideoQualityScore(video: PexelsVideo): number {
        let score = 0;

        // Duration score - more forgiving range
        if (video.duration >= 5 && video.duration <= 40) {
            score += 10; // Ideal range widened
        } else if (video.duration >= 3 && video.duration <= 50) {
            score += 8;  // Good range expanded
        } else if (video.duration >= 2 && video.duration <= 60) {
            score += 5;  // Acceptable range
        } else if (video.duration >= 1) {
            score += 2;  // Still usable
        }

        // Resolution score - more accepting of different qualities
        const maxResolution = Math.max(...video.video_files.map(f => f.width * f.height));
        if (maxResolution >= 1920 * 1080) {
            score += 8; // Full HD
        } else if (maxResolution >= 1280 * 720) {
            score += 7; // HD
        } else if (maxResolution >= 854 * 480) {
            score += 5; // SD but good
        } else if (maxResolution >= 640 * 360) {
            score += 3; // Lower quality but acceptable
        } else if (maxResolution >= 480 * 270) {
            score += 1; // Very low but usable
        }

        // Quality score based on available formats - more accepting
        const hasGoodQuality = video.video_files.some(f => {
            // Prefer HD but also accept good SD
            if (f.quality && (
                f.quality.includes('1080') ||
                f.quality.includes('720') ||
                f.quality.includes('hd')
            )) {
                return true;
            }
            // Also accept decent resolution even without quality label
            return f.width >= 640 && f.height >= 360;
        });
        if (hasGoodQuality) score += 4; // Reduced from 5 but still bonus

        // Format score - prefer MP4 but don't exclude others
        const hasMp4 = video.video_files.some(f => f.file_type === 'video/mp4');
        if (hasMp4) score += 3;

        // Frame rate bonus for standard rates
        const hasStandardFps = video.video_files.some(f =>
            f.fps >= 24 && f.fps <= 60 && [24, 25, 30, 50, 60].includes(f.fps)
        );
        if (hasStandardFps) score += 2;

        return score;
    }

    /**
     * Download video from URL
     */
    async downloadVideo(url: string): Promise<Buffer> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            console.error('Error downloading video:', error);
            throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if Pexels is properly configured
     */
    isConfigured(): boolean {
        return !!this.client;
    }
}

// Export a function to create the service
export function createPexelsService(apiKey?: string): PexelsService {
    const key = apiKey || process.env.PEXELS_API_KEY;
    if (!key) {
        throw new Error('Pexels API key not configured. Please set PEXELS_API_KEY environment variable.');
    }
    return new PexelsService(key);
}

// Export default instance
export const pexelsService = createPexelsService(); 