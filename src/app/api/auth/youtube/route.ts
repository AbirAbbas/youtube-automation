import { NextRequest, NextResponse } from 'next/server';
import { youtubeAuthService } from '@/lib/youtube-auth';
import { getYoutubeChannelById } from '@/lib/db/youtubeChannels';

export async function POST(request: NextRequest) {
    try {
        const { channelId } = await request.json();

        if (!channelId) {
            return NextResponse.json(
                { error: 'Channel ID is required' },
                { status: 400 }
            );
        }

        // Verify channel exists
        const channel = await getYoutubeChannelById(channelId);
        if (!channel) {
            return NextResponse.json(
                { error: 'Channel not found' },
                { status: 404 }
            );
        }

        // Generate OAuth authorization URL
        const authUrl = youtubeAuthService.getAuthUrl(channelId);

        return NextResponse.json({
            success: true,
            authUrl,
            message: 'Authorization URL generated successfully'
        });
    } catch (error) {
        console.error('Error generating YouTube auth URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate authorization URL' },
            { status: 500 }
        );
    }
} 