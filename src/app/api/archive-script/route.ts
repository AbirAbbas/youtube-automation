import { NextRequest, NextResponse } from 'next/server';
import { archiveVideoScript, unarchiveVideoScript } from '@/lib/db/videoScripts';

export async function POST(request: NextRequest) {
    try {
        const { scriptId, action } = await request.json();

        if (!scriptId || !action) {
            return NextResponse.json(
                { error: 'Script ID and action are required' },
                { status: 400 }
            );
        }

        if (!['archive', 'unarchive'].includes(action)) {
            return NextResponse.json(
                { error: 'Action must be either "archive" or "unarchive"' },
                { status: 400 }
            );
        }

        const scriptIdNumber = parseInt(scriptId, 10);
        if (isNaN(scriptIdNumber)) {
            return NextResponse.json(
                { error: 'Invalid script ID' },
                { status: 400 }
            );
        }

        let updatedScript;
        if (action === 'archive') {
            console.log(`📦 Archiving script with ID: ${scriptIdNumber}`);
            updatedScript = await archiveVideoScript(scriptIdNumber);
        } else {
            console.log(`📂 Unarchiving script with ID: ${scriptIdNumber}`);
            updatedScript = await unarchiveVideoScript(scriptIdNumber);
        }

        console.log(`✅ Successfully ${action}d script ${scriptIdNumber}`);

        return NextResponse.json({
            success: true,
            message: `Script ${action}d successfully`,
            script: updatedScript
        });

    } catch (error) {
        console.error(`❌ Error ${action}ing script:`, error);
        return NextResponse.json(
            {
                error: `Failed to ${action} script`,
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 