import { NextRequest, NextResponse } from 'next/server';
import { createYoutubeChannel, getAllYoutubeChannels } from '@/lib/db/youtubeChannels';

export async function GET() {
    try {
        const channels = await getAllYoutubeChannels();

        return NextResponse.json({
            success: true,
            channels
        });
    } catch (error) {
        console.error('Error fetching YouTube channels:', error);
        return NextResponse.json(
            { error: 'Failed to fetch YouTube channels' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { name, description, avatarUrl, channelUrl, subscriberCount } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: 'Channel name is required' },
                { status: 400 }
            );
        }

        const channel = await createYoutubeChannel({
            name,
            description: description || null,
            avatarUrl: avatarUrl || null,
            channelUrl: channelUrl || null,
            subscriberCount: subscriberCount || null,
        });

        return NextResponse.json({
            success: true,
            message: 'YouTube channel created successfully',
            channel
        });
    } catch (error) {
        console.error('Error creating YouTube channel:', error);
        return NextResponse.json(
            { error: 'Failed to create YouTube channel' },
            { status: 500 }
        );
    }
} 