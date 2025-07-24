import { NextRequest, NextResponse } from 'next/server';
import {
    getAllVideoScripts,
    getVideoScriptById,
    getFullScriptWithSections,
    getVideoScriptsByIdeaId
} from '@/lib/db/videoScripts';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const scriptId = searchParams.get('scriptId');
        const videoIdeaId = searchParams.get('videoIdeaId');
        const includeSections = searchParams.get('includeSections') === 'true';

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
            // Get all scripts
            const scripts = await getAllVideoScripts();
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