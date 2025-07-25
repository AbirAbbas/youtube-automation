import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

export class YouTubeAuthService {
    private oauth2Client: OAuth2Client;
    private readonly scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtubepartner'
    ];

    constructor() {
        if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
            throw new Error('YouTube OAuth credentials not configured');
        }

        this.oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`
        );
    }

    /**
     * Generate OAuth authorization URL
     */
    getAuthUrl(channelId: number): string {
        const state = this.encryptState({ channelId });
        
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes,
            state: state,
            prompt: 'consent' // Force consent screen to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code: string): Promise<{
        access_token: string;
        refresh_token: string;
        expiry_date: number;
    }> {
        const { tokens } = await this.oauth2Client.getToken(code);
        
        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Failed to get tokens from authorization code');
        }

        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date || Date.now() + (3600 * 1000) // Default 1 hour
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<{
        access_token: string;
        expiry_date: number;
    }> {
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        if (!credentials.access_token) {
            throw new Error('Failed to refresh access token');
        }

        return {
            access_token: credentials.access_token,
            expiry_date: credentials.expiry_date || Date.now() + (3600 * 1000)
        };
    }

    /**
     * Get YouTube channel information using access token
     */
    async getChannelInfo(accessToken: string): Promise<{
        id: string;
        title: string;
        description: string;
        thumbnailUrl: string;
        subscriberCount: number;
    }> {
        this.oauth2Client.setCredentials({ access_token: accessToken });
        
        const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
        
        const response = await youtube.channels.list({
            part: ['snippet', 'statistics'],
            mine: true
        });

        const channel = response.data.items?.[0];
        if (!channel) {
            throw new Error('No YouTube channel found for this account');
        }

        return {
            id: channel.id!,
            title: channel.snippet?.title || '',
            description: channel.snippet?.description || '',
            thumbnailUrl: channel.snippet?.thumbnails?.default?.url || '',
            subscriberCount: parseInt(channel.statistics?.subscriberCount || '0')
        };
    }

    /**
     * Check if access token is still valid
     */
    async isTokenValid(accessToken: string): Promise<boolean> {
        try {
            this.oauth2Client.setCredentials({ access_token: accessToken });
            
            const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
            await youtube.channels.list({
                part: ['snippet'],
                mine: true
            });
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Encrypt state parameter for OAuth flow
     */
    private encryptState(data: any): string {
        const cipher = crypto.createCipher('aes-256-cbc', process.env.NEXTAUTH_SECRET || 'fallback-secret');
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * Decrypt state parameter from OAuth flow
     */
    decryptState(encryptedState: string): any {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', process.env.NEXTAUTH_SECRET || 'fallback-secret');
            let decrypted = decipher.update(encryptedState, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        } catch (error) {
            throw new Error('Invalid state parameter');
        }
    }

    /**
     * Encrypt sensitive token data for database storage
     */
    encryptToken(token: string): string {
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('Encryption key not configured');
        }
        
        const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * Decrypt token data from database
     */
    decryptToken(encryptedToken: string): string {
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('Encryption key not configured');
        }
        
        const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
        let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}

// Export singleton instance
export const youtubeAuthService = new YouTubeAuthService(); 