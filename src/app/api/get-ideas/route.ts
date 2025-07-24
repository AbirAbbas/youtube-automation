import { NextResponse } from 'next/server';
import { getAllVideoIdeas } from '@/lib/db/videoIdeas';

export async function GET() {
    try {
        const ideas = await getAllVideoIdeas();

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