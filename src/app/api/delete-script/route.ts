import { NextRequest, NextResponse } from 'next/server';
import { deleteVideoScript } from '@/lib/db/videoScripts';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const scriptId = searchParams.get('scriptId');

        if (!scriptId) {
            return NextResponse.json(
                { error: 'Script ID is required' },
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

        console.log(`🗑️ Deleting script with ID: ${scriptIdNumber}`);

        // Delete the script (this will also delete associated sections due to foreign key constraints)
        await deleteVideoScript(scriptIdNumber);

        console.log(`✅ Successfully deleted script ${scriptIdNumber}`);

        return NextResponse.json({
            success: true,
            message: 'Script deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting script:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete script',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 