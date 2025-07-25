import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { youtubeAuthService } from './youtube-auth';
import { getYoutubeChannelById, updateYoutubeChannel } from './db/youtubeChannels';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { youtube_v3 } from 'googleapis/build/src/apis/youtube/v3';

export interface YouTubeUploadOptions {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: 'private' | 'public' | 'unlisted';
    thumbnail: string; // URL or file path (required)
    publishAt?: Date; // YouTube native scheduling
}

export interface YouTubeUploadResult {
    videoId: string;
    videoUrl: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
}

export class YouTubeUploadService {
    private oauth2Client: OAuth2Client;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`
        );
    }

    /**
     * Upload video to YouTube channel
     */
    async uploadVideo(
        channelId: number,
        videoFilePath: string,
        options: YouTubeUploadOptions
    ): Promise<YouTubeUploadResult> {
        try {
            // Get channel and verify authentication
            const channel = await getYoutubeChannelById(channelId);
            if (!channel) {
                throw new Error('Channel not found');
            }

            if (!channel.isAuthenticated || !channel.accessToken || !channel.refreshToken) {
                throw new Error('Channel is not authenticated with YouTube');
            }

            // Check if token needs refresh
            const accessToken = await this.getValidAccessToken(channel);

            // Set up authenticated YouTube client
            this.oauth2Client.setCredentials({ access_token: accessToken });
            const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

            // Prepare video metadata
            const videoMetadata = {
                snippet: {
                    title: options.title,
                    description: options.description,
                    tags: options.tags || [],
                    categoryId: options.categoryId || '22', // Default: People & Blogs
                },
                status: {
                    privacyStatus: options.privacyStatus || 'private',
                    ...(options.publishAt && { publishAt: options.publishAt.toISOString() })
                },
            };

            console.log(`🎬 Starting upload to YouTube for channel: ${channel.name}`);

            // Upload video
            const response = await youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: videoMetadata,
                media: {
                    body: fs.createReadStream(videoFilePath),
                },
            });

            const videoId = response.data.id;
            if (!videoId) {
                throw new Error('Failed to get video ID from YouTube response');
            }

            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            console.log(`✅ Video uploaded successfully: ${videoUrl}`);

            // Upload thumbnail (required)
            let thumbnailUrl: string | undefined;
            if (!options.thumbnail) {
                throw new Error('Thumbnail is required for YouTube upload');
            }
            thumbnailUrl = await this.uploadThumbnail(videoId, options.thumbnail, accessToken);

            // Update channel's last upload time
            await updateYoutubeChannel(channelId, {
                lastUploadAt: new Date(),
                updatedAt: new Date()
            });

            return {
                videoId,
                videoUrl,
                title: options.title,
                description: options.description,
                thumbnailUrl
            };

        } catch (error) {
            console.error('YouTube upload error:', error);
            throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload thumbnail for a video
     */
    private async uploadThumbnail(
        videoId: string,
        thumbnailPath: string,
        accessToken: string
    ): Promise<string> {
        try {
            this.oauth2Client.setCredentials({ access_token: accessToken });
            const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

            let thumbnailStream;

            // Handle URL vs file path
            if (thumbnailPath.startsWith('http')) {
                // Download thumbnail from URL
                const response = await fetch(thumbnailPath);
                if (!response.ok) throw new Error('Failed to download thumbnail');
                thumbnailStream = response.body;
            } else {
                // Read from file path
                if (!fs.existsSync(thumbnailPath)) {
                    throw new Error('Thumbnail file not found');
                }
                thumbnailStream = fs.createReadStream(thumbnailPath);
            }

            await youtube.thumbnails.set({
                videoId,
                media: {
                    body: thumbnailStream,
                },
            });

            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        } catch (error) {
            console.error('Thumbnail upload error:', error);
            // Don't fail the entire upload if thumbnail fails
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
    }

    /**
     * Get valid access token, refreshing if necessary
     */
    private async getValidAccessToken(channel: any): Promise<string> {
        if (!channel.accessToken || !channel.refreshToken) {
            throw new Error('No stored tokens found');
        }

        const encryptedAccessToken = channel.accessToken;
        const encryptedRefreshToken = channel.refreshToken;

        // Decrypt tokens
        const accessToken = youtubeAuthService.decryptToken(encryptedAccessToken);
        const refreshToken = youtubeAuthService.decryptToken(encryptedRefreshToken);

        // Check if token is still valid
        const isValid = await youtubeAuthService.isTokenValid(accessToken);

        if (isValid) {
            return accessToken;
        }

        // Token expired, refresh it
        console.log('🔄 Refreshing YouTube access token...');

        const { access_token, expiry_date } = await youtubeAuthService.refreshAccessToken(refreshToken);

        // Store new token
        const newEncryptedToken = youtubeAuthService.encryptToken(access_token);

        await updateYoutubeChannel(channel.id, {
            accessToken: newEncryptedToken,
            tokenExpiresAt: new Date(expiry_date),
            updatedAt: new Date()
        });

        console.log('✅ Access token refreshed successfully');

        return access_token;
    }

    /**
     * Get upload quota information for a channel
     */
    async getUploadQuota(channelId: number): Promise<{
        dailyLimit: number;
        remaining: number;
        resetTime: string;
    }> {
        try {
            const channel = await getYoutubeChannelById(channelId);
            if (!channel?.isAuthenticated) {
                throw new Error('Channel not authenticated');
            }

            const accessToken = await this.getValidAccessToken(channel);

            this.oauth2Client.setCredentials({ access_token: accessToken });
            const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

            // Note: YouTube doesn't provide direct quota API, but we can estimate
            // Based on YouTube's documentation: 10,000 units per day for most apps
            const response = await youtube.channels.list({
                part: ['statistics'],
                mine: true
            });

            return {
                dailyLimit: 10000, // YouTube's default quota
                remaining: 10000, // Would need to track usage separately
                resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
            };
        } catch (error) {
            console.error('Error getting upload quota:', error);
            throw error;
        }
    }

    /**
     * Download video from URL for upload
     */
    async downloadVideoForUpload(videoUrl: string, outputPath: string): Promise<string> {
        try {
            // Check if this is a local file path (starts with /api/local-files)
            if (videoUrl.startsWith('/api/local-files')) {
                // Convert the API route to the actual local file path
                const relativePath = videoUrl.replace('/api/local-files/', '');
                const localFilePath = path.join(process.cwd(), 'public', 'uploads', relativePath);

                console.log(`📁 Copying local video file from: ${localFilePath}`);

                // Check if the local file exists
                if (!fs.existsSync(localFilePath)) {
                    throw new Error(`Local video file not found: ${localFilePath}`);
                }

                // Ensure output directory exists
                const outputDir = path.dirname(outputPath);
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }

                // Copy the file directly
                fs.copyFileSync(localFilePath, outputPath);

                console.log(`✅ Video file copied successfully to: ${outputPath}`);
                return outputPath;
            }

            // Handle external URLs (fallback for non-local files)
            let absoluteUrl = videoUrl;
            if (videoUrl.startsWith('/')) {
                // Get the base URL from environment or default to localhost
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ||
                    'http://localhost:3000';
                absoluteUrl = `${baseUrl}${videoUrl}`;
            }

            console.log(`📥 Downloading video from: ${absoluteUrl}`);

            const response = await fetch(absoluteUrl);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(outputPath, buffer);

            return outputPath;
        } catch (error) {
            console.error('Error downloading video:', error);
            throw error;
        }
    }

    /**
     * Fetch scheduled (upcoming) videos from YouTube for a channel
     */
    async getScheduledVideosFromYouTube(channelId: number): Promise<Array<{ videoId: string; title: string; publishAt: string }>> {
        // Get channel and verify authentication
        const channel = await getYoutubeChannelById(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }
        if (!channel.isAuthenticated || !channel.accessToken || !channel.refreshToken) {
            throw new Error('Channel is not authenticated with YouTube');
        }
        // Get valid access token
        const accessToken = await this.getValidAccessToken(channel);
        this.oauth2Client.setCredentials({ access_token: accessToken });
        const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

        let scheduledVideos: Array<{ videoId: string; title: string; publishAt: string }> = [];
        let nextPageToken: string | undefined = undefined;
        const now = new Date();

        do {
            // Step 1: Get video IDs uploaded by the user
            const searchResponse: any = await youtube.search.list({
                part: ['id'],
                forMine: true,
                type: ['video'],
                maxResults: 50,
                pageToken: nextPageToken,
            });
            const videoIds = (searchResponse.data.items || [])
                .map((item: any) => item.id?.videoId)
                .filter((id: string | undefined): id is string => !!id);
            if (videoIds.length === 0) {
                break;
            }
            // Step 2: Get video details for these IDs
            const videosResponse = await youtube.videos.list({
                part: ['snippet', 'status'],
                id: videoIds,
                maxResults: 50,
            });
            const items = videosResponse.data.items || [];
            for (const item of items) {
                const status = item.status;
                const snippet = item.snippet;
                if (
                    status?.privacyStatus === 'private' &&
                    status.publishAt &&
                    new Date(status.publishAt) > now
                ) {
                    scheduledVideos.push({
                        videoId: item.id!,
                        title: snippet?.title || '',
                        publishAt: status.publishAt,
                    });
                }
            }
            nextPageToken = searchResponse.data.nextPageToken;
        } while (nextPageToken);

        // Sort by publishAt descending (latest first)
        scheduledVideos.sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
        return scheduledVideos;
    }
}

// Export singleton instance
export const youtubeUploadService = new YouTubeUploadService(); 