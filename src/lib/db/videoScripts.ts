import { eq, and } from 'drizzle-orm';
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
    return db.select().from(videoScripts).orderBy(videoScripts.createdAt);
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
}> {
    const script = await getVideoScriptById(scriptId);
    const sections = script ? await getScriptSectionsByScriptId(scriptId) : [];

    return { script, sections };
} 