import { NextRequest, NextResponse } from 'next/server';
import { youtubeAuthService } from '@/lib/youtube-auth';
import { updateYoutubeChannel } from '@/lib/db/youtubeChannels';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle OAuth error
        if (error) {
            const errorMessage = searchParams.get('error_description') || 'Authorization failed';
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent(errorMessage)}`
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent('Missing authorization code or state')}`
            );
        }

        // Decrypt state to get channel ID
        const { channelId } = youtubeAuthService.decryptState(state);

        // Exchange code for tokens
        const { access_token, refresh_token, expiry_date } = await youtubeAuthService.getTokensFromCode(code);

        // Get YouTube channel information
        const youtubeChannelInfo = await youtubeAuthService.getChannelInfo(access_token);

        // Encrypt tokens for storage
        const encryptedAccessToken = youtubeAuthService.encryptToken(access_token);
        const encryptedRefreshToken = youtubeAuthService.encryptToken(refresh_token);

        // Update channel with OAuth data
        await updateYoutubeChannel(channelId, {
            youtubeChannelId: youtubeChannelInfo.id,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: new Date(expiry_date),
            isAuthenticated: true,
            // Update channel info from YouTube
            name: youtubeChannelInfo.title,
            description: youtubeChannelInfo.description,
            avatarUrl: youtubeChannelInfo.thumbnailUrl,
            subscriberCount: youtubeChannelInfo.subscriberCount,
            updatedAt: new Date()
        });

        // Redirect back to app with success message
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}?success=${encodeURIComponent('YouTube channel connected successfully!')}&channelId=${channelId}`
        );

    } catch (error) {
        console.error('YouTube OAuth callback error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Failed to connect YouTube channel';
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}?error=${encodeURIComponent(errorMessage)}`
        );
    }
} 