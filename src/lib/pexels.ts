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
     * Find appropriate videos for script sections
     */
    async findVideosForScript(
        sections: Array<{ title: string; content: string; estimatedDuration: string }>,
        totalDurationNeeded: number
    ): Promise<SelectedVideo[]> {
        const selectedVideos: SelectedVideo[] = [];
        let totalSelectedDuration = 0;
        const minClipDuration = 4; // Minimum clip duration to avoid very short clips
        const maxClipDuration = 45; // Reduced max to get more variety
        const targetBuffer = 1.5; // Need 150% of duration to avoid looping

        console.log(`🎯 Target duration: ${totalDurationNeeded}s, gathering clips for ${totalDurationNeeded * targetBuffer}s to avoid looping`);

        // For each section, find relevant videos with more thorough searching
        for (const section of sections) {
            const keywords = this.extractKeywords(`${section.title} ${section.content}`);

            // Try MORE search terms per section to get better coverage
            for (const keyword of keywords.slice(0, 6)) { // Increased from 3 to 6
                try {
                    const searchResult = await this.searchVideos({
                        query: keyword,
                        orientation: 'landscape',
                        size: 'medium',
                        per_page: 20 // Increased from 15 to 20 for more options
                    });

                    if (searchResult.videos.length > 0) {
                        // Filter videos by duration and select multiple good ones
                        const suitableVideos = searchResult.videos.filter(v =>
                            v.duration >= minClipDuration && v.duration <= maxClipDuration
                        );

                        // Take up to 3 videos per keyword instead of just 1
                        for (let i = 0; i < Math.min(3, suitableVideos.length); i++) {
                            const video = this.selectBestVideo([suitableVideos[i]]);
                            if (video && !selectedVideos.find(v => v.id === video.id)) {
                                selectedVideos.push(video);
                                totalSelectedDuration += video.duration;
                                console.log(`📹 Selected "${keyword}" (${i + 1}): ${video.duration}s (${video.quality})`);

                                // Stop if we have enough for this keyword
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

                // Check if we have enough content
                if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) {
                    break;
                }
            }

            // If we have enough duration, stop searching sections
            if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) {
                break;
            }
        }

        // If we don't have enough duration, do MORE aggressive generic searching
        if (totalSelectedDuration < totalDurationNeeded * 1.3) { // Increased threshold
            console.log(`⚠️ Need more content: ${totalSelectedDuration}s < ${totalDurationNeeded * 1.3}s, searching more generic terms...`);
            const genericTerms = [
                'business', 'technology', 'people working', 'nature', 'city', 'abstract', 'office',
                'modern', 'creative', 'innovation', 'teamwork', 'professional', 'digital',
                'workspace', 'meeting', 'collaboration', 'success', 'growth', 'future'
            ]; // Expanded list

            for (const term of genericTerms) {
                if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) break;

                try {
                    const searchResult = await this.searchVideos({
                        query: term,
                        orientation: 'landscape',
                        per_page: 20 // Increased
                    });

                    const suitableVideos = searchResult.videos.filter(v =>
                        v.duration >= minClipDuration && v.duration <= maxClipDuration
                    );

                    // Take multiple videos per generic term too
                    for (let i = 0; i < Math.min(4, suitableVideos.length); i++) {
                        const video = this.selectBestVideo([suitableVideos[i]]);
                        if (video && !selectedVideos.find(v => v.id === video.id)) {
                            selectedVideos.push(video);
                            totalSelectedDuration += video.duration;
                            console.log(`📹 Selected generic "${term}" (${i + 1}): ${video.duration}s (${video.quality})`);

                            if (totalSelectedDuration >= totalDurationNeeded * targetBuffer) break;
                        }
                    }
                } catch (error) {
                    console.error(`Error searching for generic term "${term}":`, error);
                }
            }
        }

        // Sort videos by duration to optimize usage (longer clips first to reduce transitions)
        selectedVideos.sort((a, b) => b.duration - a.duration);

        // Final validation with more specific feedback
        const coverageRatio = totalSelectedDuration / totalDurationNeeded;
        if (coverageRatio < 1.2) {
            console.warn(`⚠️ Low coverage ratio: ${coverageRatio.toFixed(2)}x (${totalSelectedDuration}s/${totalDurationNeeded}s)`);
            console.warn(`This may result in looping clips. Recommended: gather more clips or use shorter script.`);
        } else {
            console.log(`✅ Good coverage: ${coverageRatio.toFixed(2)}x coverage ratio`);
        }

        console.log(`✅ Selected ${selectedVideos.length} videos with total duration: ${totalSelectedDuration}s (target: ${totalDurationNeeded}s)`);
        return selectedVideos;
    }

    /**
     * Select the best video from search results based on quality and duration
     */
    private selectBestVideo(videos: PexelsVideo[]): SelectedVideo | null {
        if (videos.length === 0) return null;

        // Sort by video quality and duration, prioritizing good durations
        const sortedVideos = videos.sort((a, b) => {
            // Prefer videos with good duration (5-30 seconds ideal, avoid very short)
            const aDurationScore = this.getDurationScore(a.duration);
            const bDurationScore = this.getDurationScore(b.duration);

            if (aDurationScore !== bDurationScore) {
                return bDurationScore - aDurationScore;
            }

            // Then by resolution (prefer HD)
            const aResolution = a.width * a.height;
            const bResolution = b.width * b.height;
            return bResolution - aResolution;
        });

        const bestVideo = sortedVideos[0];

        // Get the best quality file with appropriate frame rate
        const bestFile = bestVideo.video_files
            .filter(file => file.file_type === 'video/mp4')
            .sort((a, b) => {
                // First priority: prefer normal frame rates (24-30fps) to avoid slow motion
                const isNormalFpsA = a.fps >= 24 && a.fps <= 30;
                const isNormalFpsB = b.fps >= 24 && b.fps <= 30;

                if (isNormalFpsA && !isNormalFpsB) return -1;
                if (!isNormalFpsA && isNormalFpsB) return 1;

                // Second priority: quality
                const getQualityScore = (quality: string | null) => {
                    if (!quality) return 0;
                    if (quality.includes('1080')) return 3;
                    if (quality.includes('720')) return 2;
                    if (quality.includes('480')) return 1;
                    return 0;
                };

                const qualityDiff = getQualityScore(b.quality) - getQualityScore(a.quality);
                if (qualityDiff !== 0) return qualityDiff;

                // Third priority: prefer lower fps if quality is equal (to avoid unnecessary high fps)
                return a.fps - b.fps;
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