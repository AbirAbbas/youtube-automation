import { NextRequest, NextResponse } from 'next/server';
import { getAllVideoIdeas, getVideoIdeasByChannelId } from '@/lib/db/videoIdeas';
import { getYoutubeChannelById } from '@/lib/db/youtubeChannels';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get('channelId');

        let ideas;

        if (channelId) {
            const channelIdNum = parseInt(channelId, 10);
            if (isNaN(channelIdNum)) {
                return NextResponse.json(
                    { error: 'Invalid channel ID' },
                    { status: 400 }
                );
            }

            // Validate channel exists
            const channel = await getYoutubeChannelById(channelIdNum);
            if (!channel) {
                return NextResponse.json(
                    { error: 'YouTube channel not found' },
                    { status: 404 }
                );
            }

            ideas = await getVideoIdeasByChannelId(channelIdNum);
        } else {
            ideas = await getAllVideoIdeas();
        }

        return NextResponse.json({
            success: true,
            ideas
        });
    } catch (error) {
        console.error('Error fetching video ideas:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video ideas' },
            { status: 500 }
        );
    }
} 