import { NextRequest, NextResponse } from 'next/server';
import { localStorageService } from '@/lib/local-storage-service';
import { validateFile } from '@/lib/upload-utils';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const uploadType = formData.get('type') as string || 'auto';
        const folder = formData.get('folder') as string;
        const quality = formData.get('quality') as string;
        const width = formData.get('width') as string;
        const height = formData.get('height') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file based on upload type
        let validationOptions = {};
        if (uploadType === 'image') {
            validationOptions = { allowedTypes: 'image' as const, maxSizeInMB: 10 };
        } else if (uploadType === 'audio') {
            validationOptions = { allowedTypes: 'audio' as const, maxSizeInMB: 50 };
        }

        const validation = validateFile(file, validationOptions);
        if (!validation.isValid) {
            return NextResponse.json(
                { error: 'File validation failed', details: validation.errors },
                { status: 400 }
            );
        }

        // Convert file to buffer for upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Prepare upload options
        const uploadOptions: any = {
            folder: folder || 'uploads',
            public_id: `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
        };

        if (quality) uploadOptions.quality = quality;

        // Add image-specific options
        if (uploadType === 'image' && (width || height)) {
            uploadOptions.width = width ? parseInt(width) : undefined;
            uploadOptions.height = height ? parseInt(height) : undefined;
            uploadOptions.crop = 'limit';
        }

        // Upload based on type
        let result;
        switch (uploadType) {
            case 'image':
                result = await localStorageService.uploadImage(buffer, uploadOptions);
                break;
            case 'audio':
                result = await localStorageService.uploadAudio(buffer, uploadOptions);
                break;
            default:
                result = await localStorageService.uploadFile(buffer, uploadOptions);
        }

        return NextResponse.json({
            success: true,
            data: result,
            message: 'File uploaded successfully to local storage'
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            {
                error: 'Upload failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Handle file upload from URL
export async function PUT(request: NextRequest) {
    try {
        const { url, uploadType = 'auto', folder, ...options } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'No URL provided' },
                { status: 400 }
            );
        }

        const uploadOptions = {
            folder: folder || 'uploads',
            ...options,
        };

        let result;
        switch (uploadType) {
            case 'image':
                result = await localStorageService.uploadImage(url, uploadOptions);
                break;
            case 'audio':
                result = await localStorageService.uploadAudio(url, uploadOptions);
                break;
            default:
                result = await localStorageService.uploadFromUrl(url, uploadOptions);
        }

        return NextResponse.json({
            success: true,
            data: result,
            message: 'File uploaded from URL successfully to local storage'
        });

    } catch (error) {
        console.error('URL upload error:', error);
        return NextResponse.json(
            {
                error: 'URL upload failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Handle file deletion
export async function DELETE(request: NextRequest) {
    try {
        const { public_id, resource_type = 'auto' } = await request.json();

        if (!public_id) {
            return NextResponse.json(
                { error: 'Public ID is required' },
                { status: 400 }
            );
        }

        const success = await localStorageService.deleteFile(public_id, resource_type);

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'File deleted successfully from local storage'
            });
        } else {
            return NextResponse.json(
                { error: 'File not found or could not be deleted' },
                { status: 404 }
            );
        }

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            {
                error: 'Delete failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 