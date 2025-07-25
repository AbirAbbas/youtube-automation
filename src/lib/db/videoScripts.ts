import { eq, and, desc } from 'drizzle-orm';
import { db } from './index';
import {
    videoScripts,
    scriptSections,
    type VideoScript,
    type NewVideoScript,
    type ScriptSection,
    type NewScriptSection
} from './schema';

// Video Script Operations
export async function createVideoScript(data: Omit<NewVideoScript, 'id' | 'createdAt' | 'updatedAt'>) {
    const [videoScript] = await db.insert(videoScripts).values(data).returning();
    return videoScript;
}

export async function getAllVideoScripts(): Promise<VideoScript[]> {
    return db.select().from(videoScripts)
        .where(eq(videoScripts.isArchived, false))
        .orderBy(desc(videoScripts.createdAt));
}

export async function getVideoScriptById(id: number): Promise<VideoScript | undefined> {
    const [videoScript] = await db.select().from(videoScripts).where(eq(videoScripts.id, id));
    return videoScript;
}

export async function getVideoScriptsByIdeaId(videoIdeaId: number): Promise<VideoScript[]> {
    return db.select().from(videoScripts).where(eq(videoScripts.videoIdeaId, videoIdeaId));
}

export async function updateVideoScript(id: number, data: Partial<Omit<NewVideoScript, 'id' | 'createdAt'>>) {
    const [videoScript] = await db
        .update(videoScripts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(videoScripts.id, id))
        .returning();
    return videoScript;
}

export async function deleteVideoScript(id: number) {
    // Delete all script sections first (foreign key constraint)
    await db.delete(scriptSections).where(eq(scriptSections.scriptId, id));
    // Then delete the script
    await db.delete(videoScripts).where(eq(videoScripts.id, id));
}

export async function deleteScriptsByIdeaId(videoIdeaId: number) {
    // First get all scripts for this idea
    const scripts = await getVideoScriptsByIdeaId(videoIdeaId);

    // Delete each script (which will cascade delete sections)
    for (const script of scripts) {
        await deleteVideoScript(script.id);
    }
}

// Archive Management Operations
export async function archiveVideoScript(id: number): Promise<VideoScript> {
    const [videoScript] = await db
        .update(videoScripts)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(videoScripts.id, id))
        .returning();
    return videoScript;
}

export async function unarchiveVideoScript(id: number): Promise<VideoScript> {
    const [videoScript] = await db
        .update(videoScripts)
        .set({ isArchived: false, updatedAt: new Date() })
        .where(eq(videoScripts.id, id))
        .returning();
    return videoScript;
}

export async function getArchivedVideoScripts(): Promise<VideoScript[]> {
    return db.select().from(videoScripts)
        .where(eq(videoScripts.isArchived, true))
        .orderBy(desc(videoScripts.updatedAt));
}

export async function getAllVideoScriptsIncludingArchived(): Promise<VideoScript[]> {
    return db.select().from(videoScripts).orderBy(desc(videoScripts.createdAt));
}

export async function getAllVideoScriptsWithTopics(): Promise<(VideoScript & { topic?: string })[]> {
    const { videoIdeas } = await import('./schema');

    const results = await db
        .select({
            id: videoScripts.id,
            videoIdeaId: videoScripts.videoIdeaId,
            title: videoScripts.title,
            estimatedLength: videoScripts.estimatedLength,
            totalSections: videoScripts.totalSections,
            status: videoScripts.status,
            isArchived: videoScripts.isArchived,
            audioUrl: videoScripts.audioUrl,
            videoUrl: videoScripts.videoUrl,
            thumbnailPath: videoScripts.thumbnailPath,
            createdAt: videoScripts.createdAt,
            updatedAt: videoScripts.updatedAt,
            topic: videoIdeas.topic
        })
        .from(videoScripts)
        .leftJoin(videoIdeas, eq(videoScripts.videoIdeaId, videoIdeas.id))
        .where(eq(videoScripts.isArchived, false))
        .orderBy(desc(videoScripts.createdAt));

    return results.map(result => ({
        ...result,
        topic: result.topic || undefined
    }));
}

export async function getAllVideoScriptsIncludingArchivedWithTopics(): Promise<(VideoScript & { topic?: string })[]> {
    const { videoIdeas } = await import('./schema');

    const results = await db
        .select({
            id: videoScripts.id,
            videoIdeaId: videoScripts.videoIdeaId,
            title: videoScripts.title,
            estimatedLength: videoScripts.estimatedLength,
            totalSections: videoScripts.totalSections,
            status: videoScripts.status,
            isArchived: videoScripts.isArchived,
            audioUrl: videoScripts.audioUrl,
            videoUrl: videoScripts.videoUrl,
            thumbnailPath: videoScripts.thumbnailPath,
            createdAt: videoScripts.createdAt,
            updatedAt: videoScripts.updatedAt,
            topic: videoIdeas.topic
        })
        .from(videoScripts)
        .leftJoin(videoIdeas, eq(videoScripts.videoIdeaId, videoIdeas.id))
        .orderBy(desc(videoScripts.createdAt));

    return results.map(result => ({
        ...result,
        topic: result.topic || undefined
    }));
}

export async function getArchivedVideoScriptsWithTopics(): Promise<(VideoScript & { topic?: string })[]> {
    const { videoIdeas } = await import('./schema');

    const results = await db
        .select({
            id: videoScripts.id,
            videoIdeaId: videoScripts.videoIdeaId,
            title: videoScripts.title,
            estimatedLength: videoScripts.estimatedLength,
            totalSections: videoScripts.totalSections,
            status: videoScripts.status,
            isArchived: videoScripts.isArchived,
            audioUrl: videoScripts.audioUrl,
            videoUrl: videoScripts.videoUrl,
            thumbnailPath: videoScripts.thumbnailPath,
            createdAt: videoScripts.createdAt,
            updatedAt: videoScripts.updatedAt,
            topic: videoIdeas.topic
        })
        .from(videoScripts)
        .leftJoin(videoIdeas, eq(videoScripts.videoIdeaId, videoIdeas.id))
        .where(eq(videoScripts.isArchived, true))
        .orderBy(desc(videoScripts.updatedAt));

    return results.map(result => ({
        ...result,
        topic: result.topic || undefined
    }));
}

// Script Section Operations
export async function createScriptSection(data: Omit<NewScriptSection, 'id' | 'createdAt' | 'updatedAt'>) {
    const [scriptSection] = await db.insert(scriptSections).values(data).returning();
    return scriptSection;
}

export async function createMultipleScriptSections(sectionsData: Array<Omit<NewScriptSection, 'id' | 'createdAt' | 'updatedAt'>>) {
    const sections = await db.insert(scriptSections).values(sectionsData).returning();
    return sections;
}

export async function getScriptSectionsByScriptId(scriptId: number): Promise<ScriptSection[]> {
    return db.select()
        .from(scriptSections)
        .where(eq(scriptSections.scriptId, scriptId))
        .orderBy(scriptSections.orderIndex);
}

export async function getScriptSectionById(id: number): Promise<ScriptSection | undefined> {
    const [scriptSection] = await db.select().from(scriptSections).where(eq(scriptSections.id, id));
    return scriptSection;
}

export async function updateScriptSection(id: number, data: Partial<Omit<NewScriptSection, 'id' | 'createdAt'>>) {
    const [scriptSection] = await db
        .update(scriptSections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(scriptSections.id, id))
        .returning();
    return scriptSection;
}

export async function deleteScriptSection(id: number) {
    await db.delete(scriptSections).where(eq(scriptSections.id, id));
}

export async function getFullScriptWithSections(scriptId: number): Promise<{
    script: VideoScript | undefined;
    sections: ScriptSection[];
    topic?: string;
}> {
    const script = await getVideoScriptById(scriptId);
    const sections = script ? await getScriptSectionsByScriptId(scriptId) : [];

    // Get topic from related video idea if script exists
    let topic: string | undefined;
    if (script?.videoIdeaId) {
        const { videoIdeas } = await import('./schema');
        const [videoIdea] = await db
            .select({ topic: videoIdeas.topic })
            .from(videoIdeas)
            .where(eq(videoIdeas.id, script.videoIdeaId));
        topic = videoIdea?.topic || undefined;
    }

    return { script, sections, topic };
} 