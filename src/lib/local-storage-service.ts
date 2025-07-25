import { localFileStorage, LocalStorageOptions, LocalStorageResult } from './local-storage';

export interface LocalStorageUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
    duration?: number;
    resource_type: 'image' | 'video' | 'raw' | 'auto';
    created_at: string;
    is_local: true;
    local_path: string;
}

export interface LocalStorageUploadOptions {
    folder?: string;
    public_id?: string;
    tags?: string[];
    quality?: string | number;
    format?: string;
    resource_type?: 'image' | 'video' | 'audio' | 'raw' | 'auto';
    width?: number;
    height?: number;
    crop?: string;
    gravity?: string;
    transformation?: any;
    metadata?: Record<string, any>;
}

export class LocalStorageService {
    /**
     * Check if local storage is configured (always true)
     */
    isConfigured(): boolean {
        return true;
    }

    /**
     * Upload an image file
     */
    async uploadImage(
        file: string | Buffer,
        options: LocalStorageUploadOptions = {}
    ): Promise<LocalStorageUploadResult> {
        try {
            const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

            const uploadOptions: LocalStorageOptions = {
                folder: options.folder || 'images',
                public_id: options.public_id,
                tags: options.tags,
                resource_type: 'image',
                format: options.format,
                metadata: {
                    quality: options.quality,
                    width: options.width,
                    height: options.height,
                    crop: options.crop,
                    gravity: options.gravity,
                    transformation: options.transformation,
                    ...options.metadata
                }
            };

            const result = await localFileStorage.saveImage(buffer, uploadOptions);
            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading image to local storage:', error);
            throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload an audio file
     */
    async uploadAudio(
        file: string | Buffer,
        options: LocalStorageUploadOptions = {}
    ): Promise<LocalStorageUploadResult> {
        try {
            const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

            const uploadOptions: LocalStorageOptions = {
                folder: options.folder || 'audio',
                public_id: options.public_id,
                tags: options.tags,
                resource_type: 'audio',
                format: options.format,
                metadata: {
                    quality: options.quality,
                    transformation: options.transformation,
                    ...options.metadata
                }
            };

            const result = await localFileStorage.saveAudio(buffer, uploadOptions);
            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading audio to local storage:', error);
            throw new Error(`Failed to upload audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload any file (auto-detect type)
     */
    async uploadFile(
        file: string | Buffer,
        options: LocalStorageUploadOptions = {}
    ): Promise<LocalStorageUploadResult> {
        try {
            const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

            const uploadOptions: LocalStorageOptions = {
                folder: options.folder || 'uploads',
                public_id: options.public_id,
                tags: options.tags,
                resource_type: options.resource_type || 'auto',
                format: options.format,
                metadata: {
                    quality: options.quality,
                    transformation: options.transformation,
                    ...options.metadata
                }
            };

            const result = await localFileStorage.saveFile(buffer, uploadOptions);
            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading file to local storage:', error);
            throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload a video file
     */
    async uploadVideo(
        file: string | Buffer,
        options: LocalStorageUploadOptions = {}
    ): Promise<LocalStorageUploadResult> {
        try {
            const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

            const uploadOptions: LocalStorageOptions = {
                folder: options.folder || 'videos',
                public_id: options.public_id,
                tags: options.tags,
                resource_type: 'video',
                format: options.format,
                metadata: {
                    quality: options.quality,
                    width: options.width,
                    height: options.height,
                    transformation: options.transformation,
                    ...options.metadata
                }
            };

            const result = await localFileStorage.saveVideo(buffer, uploadOptions);
            return this.formatResult(result);
        } catch (error) {
            console.error('Error uploading video to local storage:', error);
            throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload from URL (download first, then save locally)
     */
    async uploadFromUrl(
        url: string,
        options: LocalStorageUploadOptions = {}
    ): Promise<LocalStorageUploadResult> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            return await this.uploadFile(buffer, options);
        } catch (error) {
            console.error('Error uploading from URL to local storage:', error);
            throw new Error(`Failed to upload from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Upload from base64 string
     */
    async uploadFromBase64(
        base64String: string,
        options: LocalStorageUploadOptions = {}
    ): Promise<LocalStorageUploadResult> {
        try {
            // Remove data URL prefix if present
            const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            return await this.uploadFile(buffer, options);
        } catch (error) {
            console.error('Error uploading from base64 to local storage:', error);
            throw new Error(`Failed to upload from base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Delete a file from local storage
     */
    async deleteFile(public_id: string, resource_type: string = 'auto'): Promise<boolean> {
        try {
            // Determine folder based on resource type
            let folder = 'uploads';
            if (resource_type === 'image') folder = 'images';
            else if (resource_type === 'video') folder = 'videos';
            else if (resource_type === 'audio') folder = 'audio';

            return await localFileStorage.deleteFile(public_id, folder);
        } catch (error) {
            console.error('Error deleting file from local storage:', error);
            return false;
        }
    }

    /**
     * Get optimized image URL (returns the same URL for local storage)
     */
    getOptimizedImageUrl(public_id: string, options: any = {}): string {
        // For local storage, we return the same URL since we don't do transformations
        return `/api/local-files/images/${public_id}.jpg`;
    }

    /**
     * Get thumbnail URL (returns the same URL for local storage)
     */
    getThumbnailUrl(public_id: string, options: any = {}): string {
        // For local storage, we return the same URL since we don't do transformations
        return `/api/local-files/images/${public_id}.jpg`;
    }

    /**
     * Check async upload status (always returns completed for local storage)
     */
    async checkAsyncUploadStatus(public_id: string, resource_type: string = 'auto'): Promise<any> {
        // Local storage is always synchronous, so return completed status
        return {
            status: 'completed',
            public_id,
            resource_type
        };
    }

    /**
     * Upload large video file (same as regular upload for local storage)
     */
    async uploadLargeVideo(
        buffer: Buffer,
        options: LocalStorageUploadOptions = {}
    ): Promise<LocalStorageUploadResult> {
        return await this.uploadVideo(buffer, options);
    }

    /**
     * Format result to match Cloudinary interface
     */
    private formatResult(result: LocalStorageResult): LocalStorageUploadResult {
        return {
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format || 'unknown',
            bytes: result.bytes,
            created_at: result.created_at,
            resource_type: result.resource_type || 'auto',
            is_local: true,
            local_path: result.local_path
        };
    }
}

// Export a singleton instance
export const localStorageService = new LocalStorageService();

// Export the class for custom instances
export { LocalStorageService }; 