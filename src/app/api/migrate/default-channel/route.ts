import { NextRequest, NextResponse } from 'next/server';
import { createYoutubeChannel, getActiveYoutubeChannelsCount } from '@/lib/db/youtubeChannels';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Starting default channel migration...');

        // Check if any channels already exist
        const channelCount = await getActiveYoutubeChannelsCount();

        if (channelCount > 0) {
            return NextResponse.json({
                success: true,
                message: 'Default channel already exists',
                channelCount
            });
        }

        // Create default channel
        const defaultChannel = await createYoutubeChannel({
            name: 'My YouTube Channel',
            description: 'Your main YouTube channel for video content creation',
        });

        console.log(`✅ Default channel created with ID: ${defaultChannel.id}`);

        return NextResponse.json({
            success: true,
            message: 'Default YouTube channel created successfully',
            channel: defaultChannel
        });

    } catch (error) {
        console.error('❌ Error during default channel migration:', error);
        return NextResponse.json(
            { error: 'Failed to create default channel' },
            { status: 500 }
        );
    }
}

// Also support GET to check migration status
export async function GET() {
    try {
        const channelCount = await getActiveYoutubeChannelsCount();

        return NextResponse.json({
            success: true,
            hasChannels: channelCount > 0,
            channelCount,
            migrationNeeded: channelCount === 0
        });
    } catch (error) {
        console.error('Error checking migration status:', error);
        return NextResponse.json(
            { error: 'Failed to check migration status' },
            { status: 500 }
        );
    }
} 