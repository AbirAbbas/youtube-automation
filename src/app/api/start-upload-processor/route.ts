import { NextRequest, NextResponse } from 'next/server';
import { uploadProcessor } from '@/lib/upload-processor';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Starting upload processor via API...');

        // Start the upload processor
        await uploadProcessor.start();

        return NextResponse.json({
            success: true,
            message: 'Upload processor started successfully'
        });

    } catch (error) {
        console.error('Error starting upload processor:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start upload processor' },
            { status: 500 }
        );
    }
} 