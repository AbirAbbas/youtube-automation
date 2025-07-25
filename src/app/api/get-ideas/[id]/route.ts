import { NextRequest, NextResponse } from 'next/server';
import { getVideoIdeaById } from '@/lib/db/videoIdeas';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ideaId = parseInt(id, 10);

        if (isNaN(ideaId)) {
            return NextResponse.json(
                { error: 'Invalid idea ID' },
                { status: 400 }
            );
        }

        const idea = await getVideoIdeaById(ideaId);
        if (!idea) {
            return NextResponse.json(
                { error: 'Video idea not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            idea
        });
    } catch (error) {
        console.error('Error fetching video idea:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video idea' },
            { status: 500 }
        );
    }
} 