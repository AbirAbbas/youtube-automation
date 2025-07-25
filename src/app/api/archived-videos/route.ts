import { NextRequest, NextResponse } from 'next/server';
import { videoArchiver } from '@/lib/video-archiver';

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

        const channelIdNumber = parseInt(channelId, 10);
        if (isNaN(channelIdNumber)) {
            return NextResponse.json(
                { error: 'Invalid channel ID' },
                { status: 400 }
            );
        }

        const archivedVideos = await videoArchiver.getArchivedVideos(channelIdNumber);

        return NextResponse.json({
            success: true,
            archivedVideos
        });

    } catch (error) {
        console.error('❌ Error getting archived videos:', error);
        return NextResponse.json(
            {
                error: 'Failed to get archived videos',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { action, scriptId, channelId, options } = await request.json();

        if (!action) {
            return NextResponse.json(
                { error: 'Action is required' },
                { status: 400 }
            );
        }

        switch (action) {
            case 'restore':
                if (!scriptId) {
                    return NextResponse.json(
                        { error: 'Script ID is required for restore action' },
                        { status: 400 }
                    );
                }

                const scriptIdNumber = parseInt(scriptId, 10);
                if (isNaN(scriptIdNumber)) {
                    return NextResponse.json(
                        { error: 'Invalid script ID' },
                        { status: 400 }
                    );
                }

                await videoArchiver.restoreVideo(scriptIdNumber);
                console.log(`📂 Restored video script ID: ${scriptIdNumber}`);

                return NextResponse.json({
                    success: true,
                    message: 'Video restored successfully'
                });

            case 'bulk-archive':
                if (!channelId) {
                    return NextResponse.json(
                        { error: 'Channel ID is required for bulk archive action' },
                        { status: 400 }
                    );
                }

                const channelIdNumber = parseInt(channelId, 10);
                if (isNaN(channelIdNumber)) {
                    return NextResponse.json(
                        { error: 'Invalid channel ID' },
                        { status: 400 }
                    );
                }

                const archivedCount = await videoArchiver.bulkArchiveChannelVideos(
                    channelIdNumber,
                    options || {}
                );

                return NextResponse.json({
                    success: true,
                    message: `Bulk archiving completed. Archived ${archivedCount} videos.`,
                    archivedCount
                });

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Must be "restore" or "bulk-archive"' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('❌ Error processing archived videos action:', error);
        return NextResponse.json(
            {
                error: 'Failed to process archived videos action',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 