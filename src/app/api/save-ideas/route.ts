import { NextRequest, NextResponse } from 'next/server';
import { createVideoIdea } from '@/lib/db/videoIdeas';

interface VideoIdea {
    title: string;
    description: string;
    estimatedLength: string;
    topic?: string;
    category?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { ideas, topic, category }: { ideas: VideoIdea[]; topic?: string; category?: string } = await request.json();

        if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
            return NextResponse.json(
                { error: 'Ideas array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Validate each idea has required fields
        for (const idea of ideas) {
            if (!idea.title || !idea.description) {
                return NextResponse.json(
                    { error: 'Each idea must have a title and description' },
                    { status: 400 }
                );
            }
        }

        // Save all ideas to database
        const savedIdeas = [];
        for (const idea of ideas) {
            const savedIdea = await createVideoIdea({
                title: idea.title,
                description: idea.description,
                estimatedLength: idea.estimatedLength || null,
                topic: topic || null,
                category: category || null,
            });
            savedIdeas.push(savedIdea);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully saved ${savedIdeas.length} video ideas`,
            savedIdeas
        });
    } catch (error) {
        console.error('Error saving video ideas:', error);
        return NextResponse.json(
            { error: 'Failed to save video ideas' },
            { status: 500 }
        );
    }
} 