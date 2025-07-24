import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
});

// Types for upload options
export interface CloudinaryUploadOptions {
    folder?: string;
    public_id?: string;
    tags?: string[];
    transformation?: any;
    quality?: string | number;
    format?: string;
}

export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
    duration?: number; // For audio/video files
    resource_type: 'image' | 'video' | 'raw' | 'auto';
    created_at: string;
}

export interface ImageUploadOptions extends CloudinaryUploadOptions {
    width?: number;
    height?: number;
    crop?: 'scale' | 'fit' | 'limit' | 'mfit' | 'fill' | 'lfill' | 'pad' | 'lpad' | 'mpad' | 'crop' | 'thumb' | 'imagga_crop' | 'imagga_scale';
    gravity?: 'auto' | 'center' | 'north' | 'south' | 'east' | 'west' | 'north_east' | 'north_west' | 'south_east' | 'south_west';
}

export interface AudioUploadOptions extends CloudinaryUploadOptions {
    bit_rate?: string;
    frequency?: number;
}

class CloudinaryService {
    /**
     * Upload an image file
     */
    async uploadImage(
        file: string | Buffer,
        options: ImageUploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            const uploadOptions = {
                resource_type: 'image' as const,
                folder: options.folder || 'images',
                quality: options.quality || 'auto',
                format: options.format || 'auto',
                ...options,
            };

            // Add transformation if specified
            if (options.width || options.height || options.crop) {
                uploadOptions.transformation = {
                    width: options.width,
                    height: options.height,
                    crop: options.crop || 'limit',
                    gravity: options.gravity,
                    ...options.transformation,
                };
            }

            // Convert Buffer to base64 data URL for Cloudinary upload
            let uploadFile: string;
            if (Buffer.isBuffer(file)) {
                uploadFile = `data:image/jpeg;base64,${file.toString('base64')}`;
            } else {
                uploadFile = file;
            }

            const result = await cloudinary.uploader.upload(uploadFile, uploadOptions);
            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading image to Cloudinary:', error);
            throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload an audio file
     */
    async uploadAudio(
        file: string | Buffer,
        options: AudioUploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            const uploadOptions = {
                resource_type: 'video' as const, // Cloudinary uses 'video' for audio files
                folder: options.folder || 'audio',
                ...options,
            };

            // Add audio-specific transformations
            if (options.bit_rate || options.frequency) {
                uploadOptions.transformation = {
                    bit_rate: options.bit_rate,
                    audio_frequency: options.frequency,
                    ...options.transformation,
                };
            }

            // Convert Buffer to base64 data URL for Cloudinary upload
            let uploadFile: string;
            if (Buffer.isBuffer(file)) {
                uploadFile = `data:audio/mp3;base64,${file.toString('base64')}`;
            } else {
                uploadFile = file;
            }

            const result = await cloudinary.uploader.upload(uploadFile, uploadOptions);
            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading audio to Cloudinary:', error);
            throw new Error(`Failed to upload audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload any file (auto-detect type)
     */
    async uploadFile(
        file: string | Buffer,
        options: CloudinaryUploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            const uploadOptions = {
                resource_type: 'auto' as const,
                folder: options.folder || 'uploads',
                ...options,
            };

            // Convert Buffer to base64 data URL for Cloudinary upload
            let uploadFile: string;
            if (Buffer.isBuffer(file)) {
                uploadFile = `data:application/octet-stream;base64,${file.toString('base64')}`;
            } else {
                uploadFile = file;
            }

            const result = await cloudinary.uploader.upload(uploadFile, uploadOptions);
            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading file to Cloudinary:', error);
            throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload from a base64 string
     */
    async uploadFromBase64(
        base64String: string,
        options: CloudinaryUploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            // Ensure the base64 string has the proper data URL format
            const dataUrl = base64String.startsWith('data:')
                ? base64String
                : `data:image/jpeg;base64,${base64String}`;

            return await this.uploadFile(dataUrl, options);
        } catch (error) {
            console.error('Error uploading base64 to Cloudinary:', error);
            throw new Error(`Failed to upload base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload from a URL
     */
    async uploadFromUrl(
        url: string,
        options: CloudinaryUploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            return await this.uploadFile(url, options);
        } catch (error) {
            console.error('Error uploading from URL to Cloudinary:', error);
            throw new Error(`Failed to upload from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload a large video file using chunked upload
     */
    async uploadLargeVideo(
        buffer: Buffer,
        options: {
            folder?: string;
            quality?: string;
            format?: string;
            resource_type?: string;
        } = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            // For large files, use stream upload which can handle buffers directly
            const uploadOptions = {
                resource_type: 'video' as const,
                folder: options.folder || 'videos',
                quality: options.quality || 'auto',
                format: options.format || 'mp4',
            };

            // Convert buffer to stream and upload
            const result = await new Promise<any>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(buffer);
            });

            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading large video to Cloudinary:', error);
            throw new Error(`Failed to upload large video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a file from Cloudinary
     */
    async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<any> {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });
            return result;
        } catch (error) {
            console.error('Error deleting file from Cloudinary:', error);
            throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get optimized URL for an image
     */
    getOptimizedImageUrl(
        publicId: string,
        options: {
            width?: number;
            height?: number;
            quality?: string | number;
            format?: string;
            crop?: string;
            gravity?: string;
        } = {}
    ): string {
        return cloudinary.url(publicId, {
            secure: true,
            quality: options.quality || 'auto',
            format: options.format || 'auto',
            transformation: {
                width: options.width,
                height: options.height,
                crop: options.crop || 'limit',
                gravity: options.gravity,
            },
        });
    }

    /**
     * Get thumbnail URL for images or videos
     */
    getThumbnailUrl(
        publicId: string,
        options: {
            width?: number;
            height?: number;
            quality?: string | number;
        } = {}
    ): string {
        return cloudinary.url(publicId, {
            secure: true,
            quality: options.quality || 'auto',
            format: 'jpg',
            transformation: {
                width: options.width || 300,
                height: options.height || 300,
                crop: 'thumb',
                gravity: 'auto',
            },
        });
    }

    /**
     * Format the Cloudinary result to our standard format
     */
    private formatResult(result: any): CloudinaryUploadResult {
        return {
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            duration: result.duration,
            resource_type: result.resource_type,
            created_at: result.created_at,
        };
    }

    /**
     * Check if Cloudinary is properly configured
     */
    isConfigured(): boolean {
        return !!(process.env.CLOUDINARY_URL);
    }
}

// Export a singleton instance
export const cloudinaryService = new CloudinaryService();

// Export the class for custom instances
export { CloudinaryService };

// Export cloudinary instance for advanced usage
export { cloudinary }; 