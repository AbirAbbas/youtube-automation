import { uploadProcessor } from './upload-processor';

let isStarted = false;

export async function startUploadProcessor() {
    if (isStarted) {
        console.log('Upload processor already started');
        return;
    }

    try {
        console.log('🚀 Starting upload processor on application startup...');
        await uploadProcessor.start();
        isStarted = true;
        console.log('✅ Upload processor started successfully');
    } catch (error) {
        console.error('❌ Failed to start upload processor:', error);
    }
}

// Start the processor when this module is imported
if (typeof window === 'undefined') {
    // Only run on server side
    startUploadProcessor().catch(console.error);
} 