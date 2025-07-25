import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeChannelById, updateYoutubeChannel, deleteYoutubeChannel } from '@/lib/db/youtubeChannels';
import { youtubeChannels } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const channelId = parseInt(id, 10);

        if (isNaN(channelId)) {
            return NextResponse.json(
                { error: 'Invalid channel ID' },
                { status: 400 }
            );
        }

        const channel = await getYoutubeChannelById(channelId);

        if (!channel) {
            return NextResponse.json(
                { error: 'YouTube channel not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            channel
        });
    } catch (error) {
        console.error('Error fetching YouTube channel:', error);
        return NextResponse.json(
            { error: 'Failed to fetch YouTube channel' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const channelId = parseInt(id, 10);

        if (isNaN(channelId)) {
            return NextResponse.json(
                { error: 'Invalid channel ID' },
                { status: 400 }
            );
        }

        const { name, description, avatarUrl, channelUrl, subscriberCount } = await request.json();

        // Check if channel exists
        const existingChannel = await getYoutubeChannelById(channelId);
        if (!existingChannel) {
            return NextResponse.json(
                { error: 'YouTube channel not found' },
                { status: 404 }
            );
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (channelUrl !== undefined) updateData.channelUrl = channelUrl;
        if (subscriberCount !== undefined) updateData.subscriberCount = subscriberCount;

        const channel = await updateYoutubeChannel(channelId, updateData);

        return NextResponse.json({
            success: true,
            message: 'YouTube channel updated successfully',
            channel
        });
    } catch (error) {
        console.error('Error updating YouTube channel:', error);
        return NextResponse.json(
            { error: 'Failed to update YouTube channel' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const channelId = parseInt(id, 10);

        if (isNaN(channelId)) {
            return NextResponse.json(
                { error: 'Invalid channel ID' },
                { status: 400 }
            );
        }

        // Check if channel exists
        const existingChannel = await getYoutubeChannelById(channelId);
        if (!existingChannel) {
            return NextResponse.json(
                { error: 'YouTube channel not found' },
                { status: 404 }
            );
        }

        const channel = await deleteYoutubeChannel(channelId);

        return NextResponse.json({
            success: true,
            message: 'YouTube channel deleted successfully',
            channel
        });
    } catch (error) {
        console.error('Error deleting YouTube channel:', error);
        return NextResponse.json(
            { error: 'Failed to delete YouTube channel' },
            { status: 500 }
        );
    }
}

// --- Channel Preferences (topic/category) ---
// Removed GET and POST for preferences; moved to preferences/route.ts 