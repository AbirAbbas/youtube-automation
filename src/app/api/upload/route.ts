import { NextRequest, NextResponse } from 'next/server';
import { cloudinaryService } from '@/lib/cloudinary';
import { validateFile } from '@/lib/upload-utils';

export async function POST(request: NextRequest) {
    try {
        // Check if Cloudinary is configured
        if (!cloudinaryService.isConfigured()) {
            return NextResponse.json(
                { error: 'Cloudinary is not properly configured. Please check your CLOUDINARY_URL environment variable.' },
                { status: 500 }
            );
        }

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
                result = await cloudinaryService.uploadImage(buffer, uploadOptions);
                break;
            case 'audio':
                result = await cloudinaryService.uploadAudio(buffer, uploadOptions);
                break;
            default:
                result = await cloudinaryService.uploadFile(buffer, uploadOptions);
        }

        return NextResponse.json({
            success: true,
            data: result,
            message: 'File uploaded successfully'
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
        if (!cloudinaryService.isConfigured()) {
            return NextResponse.json(
                { error: 'Cloudinary is not properly configured. Please check your CLOUDINARY_URL environment variable.' },
                { status: 500 }
            );
        }

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
                result = await cloudinaryService.uploadImage(url, uploadOptions);
                break;
            case 'audio':
                result = await cloudinaryService.uploadAudio(url, uploadOptions);
                break;
            default:
                result = await cloudinaryService.uploadFromUrl(url, uploadOptions);
        }

        return NextResponse.json({
            success: true,
            data: result,
            message: 'File uploaded from URL successfully'
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

// Delete file
export async function DELETE(request: NextRequest) {
    try {
        if (!cloudinaryService.isConfigured()) {
            return NextResponse.json(
                { error: 'Cloudinary is not properly configured. Please check your CLOUDINARY_URL environment variable.' },
                { status: 500 }
            );
        }

        const { public_id, resource_type = 'image' } = await request.json();

        if (!public_id) {
            return NextResponse.json(
                { error: 'No public_id provided' },
                { status: 400 }
            );
        }

        const result = await cloudinaryService.deleteFile(public_id, resource_type);

        return NextResponse.json({
            success: true,
            data: result,
            message: 'File deleted successfully'
        });

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