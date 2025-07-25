import { eq, desc } from 'drizzle-orm';
import { db } from './index';
import { youtubeChannels, type YoutubeChannel, type NewYoutubeChannel } from './schema';

export async function createYoutubeChannel(data: Omit<NewYoutubeChannel, 'id' | 'createdAt' | 'updatedAt'>) {
    const [channel] = await db.insert(youtubeChannels).values(data).returning();
    return channel;
}

export async function getAllYoutubeChannels(): Promise<YoutubeChannel[]> {
    return db.select().from(youtubeChannels).where(eq(youtubeChannels.isActive, true)).orderBy(desc(youtubeChannels.createdAt));
}

export async function getYoutubeChannelById(id: number): Promise<YoutubeChannel | undefined> {
    const [channel] = await db.select().from(youtubeChannels).where(eq(youtubeChannels.id, id));
    return channel;
}

export async function updateYoutubeChannel(id: number, data: Partial<Omit<NewYoutubeChannel, 'id' | 'createdAt'>>) {
    const [channel] = await db
        .update(youtubeChannels)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(youtubeChannels.id, id))
        .returning();
    return channel;
}

export async function deleteYoutubeChannel(id: number) {
    // Soft delete by setting isActive to false
    const [channel] = await db
        .update(youtubeChannels)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(youtubeChannels.id, id))
        .returning();
    return channel;
}

export async function getActiveYoutubeChannelsCount(): Promise<number> {
    const channels = await db.select().from(youtubeChannels).where(eq(youtubeChannels.isActive, true));
    return channels.length;
}

export async function getDefaultYoutubeChannel(): Promise<YoutubeChannel | undefined> {
    // Get the first active channel, useful for backward compatibility
    const channels = await db.select().from(youtubeChannels).where(eq(youtubeChannels.isActive, true)).limit(1);
    return channels[0];
} 