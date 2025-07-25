import { NextRequest, NextResponse } from 'next/server';
import { videoScheduler } from '@/lib/video-scheduler';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get('channelId');

        if (!channelId) {
            return NextResponse.json(
                { error: 'Channel ID is required' },
                { status: 400 }
            );
        }

        const scheduledVideos = await videoScheduler.getScheduledVideos(parseInt(channelId));

        return NextResponse.json({
            success: true,
            scheduledVideos: scheduledVideos.map(video => ({
                ...video,
                tags: video.tags ? JSON.parse(video.tags) : []
            }))
        });

    } catch (error) {
        console.error('Error fetching scheduled videos:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch scheduled videos' },
            { status: 500 }
        );
    }
} 