import { eq, or, and } from 'drizzle-orm';
import { db } from './index';
import { videoIdeas, type VideoIdea, type NewVideoIdea } from './schema';

export async function createVideoIdea(data: Omit<NewVideoIdea, 'id' | 'createdAt' | 'updatedAt'>) {
    const [videoIdea] = await db.insert(videoIdeas).values(data).returning();
    return videoIdea;
}

export async function getAllVideoIdeas(): Promise<VideoIdea[]> {
    return db.select().from(videoIdeas).where(eq(videoIdeas.status, 'active')).orderBy(videoIdeas.createdAt);
}

export async function getVideoIdeasByChannelId(channelId: number): Promise<VideoIdea[]> {
    return db.select().from(videoIdeas)
        .where(
            and(
                eq(videoIdeas.channelId, channelId),
                eq(videoIdeas.status, 'active')
            )
        )
        .orderBy(videoIdeas.createdAt);
}

export async function getVideoIdeaById(id: number): Promise<VideoIdea | undefined> {
    const [videoIdea] = await db.select().from(videoIdeas).where(eq(videoIdeas.id, id));
    return videoIdea;
}

export async function updateVideoIdea(id: number, data: Partial<Omit<NewVideoIdea, 'id' | 'createdAt'>>) {
    const [videoIdea] = await db
        .update(videoIdeas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(videoIdeas.id, id))
        .returning();
    return videoIdea;
}

export async function deleteVideoIdea(id: number) {
    await db.delete(videoIdeas).where(eq(videoIdeas.id, id));
} 