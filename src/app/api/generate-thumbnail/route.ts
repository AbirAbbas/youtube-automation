import { NextRequest, NextResponse } from 'next/server';
import { generateThumbnail } from '@/lib/generate-thumbnail';
import { getVideoScriptById, updateVideoScript } from '@/lib/db/videoScripts';

export async function POST(request: NextRequest) {
    try {
        const { scriptId } = await request.json();

        if (!scriptId) {
            return NextResponse.json(
                { error: 'Script ID is required' },
                { status: 400 }
            );
        }

        // Get the script
        const script = await getVideoScriptById(scriptId);
        if (!script) {
            return NextResponse.json(
                { error: 'Script not found' },
                { status: 404 }
            );
        }

        // Check if thumbnail already exists
        if (script.thumbnailPath) {
            return NextResponse.json(
                { error: 'Thumbnail already exists for this script' },
                { status: 400 }
            );
        }

        // Generate thumbnail
        const thumbnailPath = await generateThumbnail(script.title);

        // Update the script with the thumbnail path
        await updateVideoScript(scriptId, {
            thumbnailPath
        });

        return NextResponse.json({
            success: true,
            thumbnailPath,
            message: 'Thumbnail generated successfully'
        });

    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate thumbnail',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 