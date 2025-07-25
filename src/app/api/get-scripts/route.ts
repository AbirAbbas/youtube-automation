import { NextRequest, NextResponse } from 'next/server';
import {
    getAllVideoScripts,
    getVideoScriptById,
    getFullScriptWithSections,
    getVideoScriptsByIdeaId,
    getArchivedVideoScripts,
    getAllVideoScriptsIncludingArchived,
    getAllVideoScriptsWithTopics,
    getAllVideoScriptsIncludingArchivedWithTopics,
    getArchivedVideoScriptsWithTopics
} from '@/lib/db/videoScripts';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const scriptId = searchParams.get('scriptId');
        const videoIdeaId = searchParams.get('videoIdeaId');
        const includeSections = searchParams.get('includeSections') === 'true';
        const archived = searchParams.get('archived') === 'true';
        const includeArchived = searchParams.get('includeArchived') === 'true';

        if (scriptId) {
            // Get specific script
            const scriptIdNum = parseInt(scriptId, 10);
            if (isNaN(scriptIdNum)) {
                return NextResponse.json(
                    { error: 'Invalid script ID' },
                    { status: 400 }
                );
            }

            if (includeSections) {
                const { script, sections } = await getFullScriptWithSections(scriptIdNum);
                if (!script) {
                    return NextResponse.json(
                        { error: 'Script not found' },
                        { status: 404 }
                    );
                }
                return NextResponse.json({ script, sections });
            } else {
                const script = await getVideoScriptById(scriptIdNum);
                if (!script) {
                    return NextResponse.json(
                        { error: 'Script not found' },
                        { status: 404 }
                    );
                }
                return NextResponse.json({ script });
            }
        } else if (videoIdeaId) {
            // Get scripts for a specific video idea
            const videoIdeaIdNum = parseInt(videoIdeaId, 10);
            if (isNaN(videoIdeaIdNum)) {
                return NextResponse.json(
                    { error: 'Invalid video idea ID' },
                    { status: 400 }
                );
            }

            const scripts = await getVideoScriptsByIdeaId(videoIdeaIdNum);
            return NextResponse.json({ scripts });
        } else {
            // Get all scripts based on archive status
            let scripts;
            if (archived) {
                // Get only archived scripts with topics
                scripts = await getArchivedVideoScriptsWithTopics();
            } else if (includeArchived) {
                // Get all scripts (active + archived) with topics
                scripts = await getAllVideoScriptsIncludingArchivedWithTopics();
            } else {
                // Get only active (non-archived) scripts with topics (default behavior)
                scripts = await getAllVideoScriptsWithTopics();
            }
            return NextResponse.json({ scripts });
        }
    } catch (error) {
        console.error('Error retrieving scripts:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve scripts' },
            { status: 500 }
        );
    }
} 