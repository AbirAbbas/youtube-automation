/**
 * Utility functions for file uploads and handling
 */

/**
 * Convert a File object to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert file to base64'));
            }
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * Convert a File object to Buffer (for server-side usage)
 */
export function fileToBuffer(file: File): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(Buffer.from(reader.result));
            } else {
                reject(new Error('Failed to convert file to buffer'));
            }
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * Validate file type for images
 */
export function isValidImageType(file: File): boolean {
    const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff'
    ];
    return validTypes.includes(file.type);
}

/**
 * Validate file type for audio
 */
export function isValidAudioType(file: File): boolean {
    const validTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/flac',
        'audio/m4a'
    ];
    return validTypes.includes(file.type);
}

/**
 * Validate file size (in bytes)
 */
export function isValidFileSize(file: File, maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = getFileExtension(originalName);
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');

    return prefix
        ? `${prefix}_${cleanName}_${timestamp}_${randomString}.${extension}`
        : `${cleanName}_${timestamp}_${randomString}.${extension}`;
}

/**
 * Validate and prepare file for upload
 */
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    file?: File;
}

export function validateFile(
    file: File,
    options: {
        allowedTypes?: 'image' | 'audio' | 'any';
        maxSizeInMB?: number;
        requiredExtensions?: string[];
    } = {}
): FileValidationResult {
    const errors: string[] = [];
    const { allowedTypes = 'any', maxSizeInMB = 10, requiredExtensions } = options;

    // Check file size
    if (!isValidFileSize(file, maxSizeInMB)) {
        errors.push(`File size must be less than ${maxSizeInMB}MB`);
    }

    // Check file type
    if (allowedTypes === 'image' && !isValidImageType(file)) {
        errors.push('File must be a valid image type (JPEG, PNG, GIF, WebP, BMP, TIFF)');
    } else if (allowedTypes === 'audio' && !isValidAudioType(file)) {
        errors.push('File must be a valid audio type (MP3, WAV, OGG, AAC, FLAC, M4A)');
    }

    // Check required extensions
    if (requiredExtensions && requiredExtensions.length > 0) {
        const fileExtension = getFileExtension(file.name).toLowerCase();
        if (!requiredExtensions.includes(fileExtension)) {
            errors.push(`File extension must be one of: ${requiredExtensions.join(', ')}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        file: errors.length === 0 ? file : undefined,
    };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicIdFromUrl(cloudinaryUrl: string): string | null {
    try {
        // Match pattern: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{public_id}.{format}
        const regex = /\/upload\/(?:v\d+\/)?(?:[^/]+\/)*([^/.]+)/;
        const match = cloudinaryUrl.match(regex);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Error extracting public ID from URL:', error);
        return null;
    }
} 