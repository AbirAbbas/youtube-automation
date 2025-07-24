import { NextRequest, NextResponse } from 'next/server';
import { deleteVideoIdea } from '@/lib/db/videoIdeas';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ideaId = searchParams.get('id');

        if (!ideaId) {
            return NextResponse.json(
                { error: 'Video idea ID is required' },
                { status: 400 }
            );
        }

        const ideaIdNum = parseInt(ideaId, 10);
        if (isNaN(ideaIdNum)) {
            return NextResponse.json(
                { error: 'Invalid video idea ID' },
                { status: 400 }
            );
        }

        await deleteVideoIdea(ideaIdNum);

        return NextResponse.json({
            success: true,
            message: 'Video idea deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting video idea:', error);
        return NextResponse.json(
            { error: 'Failed to delete video idea' },
            { status: 500 }
        );
    }
} 