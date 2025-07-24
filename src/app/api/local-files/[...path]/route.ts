import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { localFileStorage } from '@/lib/local-storage';

// MIME type mapping for common video formats
const MIME_TYPES: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/mp4',
    '.3gp': 'video/3gpp',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.json': 'application/json',
};

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const resolvedParams = await params;
        const filePath = resolvedParams.path.join('/');

        if (!filePath) {
            return NextResponse.json(
                { error: 'File path is required' },
                { status: 400 }
            );
        }

        // Security check: prevent path traversal attacks
        if (filePath.includes('..') || filePath.includes('\\') || path.isAbsolute(filePath)) {
            return NextResponse.json(
                { error: 'Invalid file path' },
                { status: 400 }
            );
        }

        // Construct the full file path
        const baseDir = localFileStorage.getBaseDir();
        const fullFilePath = path.join(baseDir, filePath);

        // Check if file exists
        try {
            await fs.access(fullFilePath);
        } catch {
            return NextResponse.json(
                { error: 'File not found' },
                { status: 404 }
            );
        }

        // Get file stats
        const stats = await fs.stat(fullFilePath);

        if (!stats.isFile()) {
            return NextResponse.json(
                { error: 'Not a file' },
                { status: 400 }
            );
        }

        // Determine content type
        const ext = path.extname(fullFilePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Handle range requests for video streaming
        const range = request.headers.get('range');

        if (range && contentType.startsWith('video/')) {
            return await handleRangeRequest(fullFilePath, range, stats.size, contentType);
        }

        // For non-range requests or small files, serve the entire file
        const fileBuffer = await fs.readFile(fullFilePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                'Last-Modified': stats.mtime.toUTCString(),
                // Security headers
                'X-Content-Type-Options': 'nosniff',
            },
        });

    } catch (error) {
        console.error('Error serving local file:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Handle HTTP range requests for video streaming
 */
async function handleRangeRequest(
    filePath: string,
    range: string,
    fileSize: number,
    contentType: string
): Promise<NextResponse> {
    // Parse range header (e.g., "bytes=0-1023")
    const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);

    if (!rangeMatch) {
        return NextResponse.json(
            { error: 'Invalid range header' },
            { status: 400 }
        );
    }

    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;

    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
            status: 416,
            headers: {
                'Content-Range': `bytes */${fileSize}`,
            },
        });
    }

    const chunkSize = end - start + 1;

    // Read the requested chunk
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    await fileHandle.read(buffer, 0, chunkSize, start);
    await fileHandle.close();

    return new NextResponse(buffer, {
        status: 206, // Partial Content
        headers: {
            'Content-Type': contentType,
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000',
            // Security headers
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

// Also handle HEAD requests for file info
export async function HEAD(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const resolvedParams = await params;
        const filePath = resolvedParams.path.join('/');

        if (!filePath || filePath.includes('..') || filePath.includes('\\') || path.isAbsolute(filePath)) {
            return new NextResponse(null, { status: 400 });
        }

        const baseDir = localFileStorage.getBaseDir();
        const fullFilePath = path.join(baseDir, filePath);

        try {
            const stats = await fs.stat(fullFilePath);

            if (!stats.isFile()) {
                return new NextResponse(null, { status: 400 });
            }

            const ext = path.extname(fullFilePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': stats.size.toString(),
                    'Accept-Ranges': 'bytes',
                    'Last-Modified': stats.mtime.toUTCString(),
                },
            });
        } catch {
            return new NextResponse(null, { status: 404 });
        }
    } catch {
        return new NextResponse(null, { status: 500 });
    }
} 