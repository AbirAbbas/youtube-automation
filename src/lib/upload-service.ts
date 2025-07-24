import { cloudinaryService, CloudinaryUploadResult, CloudinaryUploadOptions } from './cloudinary';
import { localFileStorage, LocalStorageResult, LocalStorageOptions } from './local-storage';

export interface HybridUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    bytes: number;
    created_at: string;
    storage_type: 'cloudinary' | 'local';
    is_local?: boolean;
    local_path?: string;
    // Cloudinary specific fields (when available)
    format?: string;
    width?: number;
    height?: number;
    duration?: number;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

export interface HybridUploadOptions {
    folder?: string;
    public_id?: string;
    tags?: string[];
    quality?: string | number;
    format?: string;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    metadata?: Record<string, any>;
    // Fallback settings
    enableLocalFallback?: boolean;
    maxCloudinarySize?: number; // in bytes, default 60MB (just under Cloudinary's 62MB limit)
    forceLocal?: boolean; // Force local storage (useful for testing)
}

export class HybridUploadService {
    private readonly DEFAULT_MAX_CLOUDINARY_SIZE = 60 * 1024 * 1024; // 60MB

    /**
     * Upload a file with Cloudinary-first, local-fallback strategy
     */
    async uploadFile(
        buffer: Buffer,
        options: HybridUploadOptions = {}
    ): Promise<HybridUploadResult> {
        const {
            enableLocalFallback = true,
            maxCloudinarySize = this.DEFAULT_MAX_CLOUDINARY_SIZE,
            forceLocal = false,
            ...uploadOptions
        } = options;

        const fileSize = buffer.length;
        const fileSizeMB = fileSize / 1024 / 1024;

        console.log(`📤 Uploading file: ${fileSizeMB.toFixed(2)}MB`);

        // Check if we should force local storage
        if (forceLocal) {
            console.log('🏠 Using local storage (forced)');
            return await this.uploadToLocal(buffer, uploadOptions);
        }

        // Check if file is too large for Cloudinary
        if (fileSize > maxCloudinarySize) {
            console.log(`⚠️ File size (${fileSizeMB.toFixed(2)}MB) exceeds Cloudinary limit (${(maxCloudinarySize / 1024 / 1024).toFixed(2)}MB), using local storage`);
            
            if (enableLocalFallback) {
                return await this.uploadToLocal(buffer, uploadOptions);
            } else {
                throw new Error(`File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size`);
            }
        }

        // Try Cloudinary first
        try {
            console.log('☁️ Attempting Cloudinary upload...');
            const cloudinaryResult = await this.uploadToCloudinary(buffer, uploadOptions);
            console.log('✅ Cloudinary upload successful');
            return cloudinaryResult;
        } catch (error) {
            console.error('❌ Cloudinary upload failed:', error);

            // Check if it's a size-related error or if fallback is enabled
            if (enableLocalFallback) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Common Cloudinary size/limit errors
                const isSizeError = errorMessage.includes('byte size') || 
                                   errorMessage.includes('too large') ||
                                   errorMessage.includes('62910000') ||
                                   errorMessage.includes('file size');

                if (isSizeError) {
                    console.log('🔄 Size limit detected, falling back to local storage...');
                } else {
                    console.log('🔄 Cloudinary failed, falling back to local storage...');
                }

                try {
                    return await this.uploadToLocal(buffer, uploadOptions);
                } catch (localError) {
                    console.error('❌ Local storage fallback also failed:', localError);
                    throw new Error(`Both Cloudinary and local storage failed. Cloudinary: ${errorMessage}, Local: ${localError instanceof Error ? localError.message : String(localError)}`);
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Upload specifically to Cloudinary
     */
    private async uploadToCloudinary(
        buffer: Buffer,
        options: Omit<HybridUploadOptions, 'enableLocalFallback' | 'maxCloudinarySize' | 'forceLocal'>
    ): Promise<HybridUploadResult> {
        const cloudinaryOptions: CloudinaryUploadOptions = {
            folder: options.folder,
            public_id: options.public_id,
            tags: options.tags,
            quality: options.quality,
            format: options.format,
        };

        let result: CloudinaryUploadResult;

        // Use appropriate upload method based on resource type and size
        if (options.resource_type === 'video' || (!options.resource_type && buffer.length > 10 * 1024 * 1024)) {
            // Use large video upload for video files or large files
            result = await cloudinaryService.uploadLargeVideo(buffer, {
                folder: options.folder,
                quality: typeof options.quality === 'string' ? options.quality : undefined,
                format: options.format
            });
        } else {
            // Use regular upload for smaller files
            result = await cloudinaryService.uploadFile(buffer, cloudinaryOptions);
        }

        return {
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            bytes: result.bytes,
            created_at: result.created_at,
            storage_type: 'cloudinary',
            format: result.format,
            width: result.width,
            height: result.height,
            duration: result.duration,
            resource_type: result.resource_type
        };
    }

    /**
     * Upload specifically to local storage
     */
    private async uploadToLocal(
        buffer: Buffer,
        options: Omit<HybridUploadOptions, 'enableLocalFallback' | 'maxCloudinarySize' | 'forceLocal'>
    ): Promise<HybridUploadResult> {
        const localOptions: LocalStorageOptions = {
            folder: options.folder || 'videos',
            public_id: options.public_id,
            tags: options.tags,
            metadata: {
                quality: options.quality,
                format: options.format,
                resource_type: options.resource_type,
                ...options.metadata
            }
        };

        const result = await localFileStorage.saveVideo(buffer, localOptions);

        return {
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            bytes: result.bytes,
            created_at: result.created_at,
            storage_type: 'local',
            is_local: true,
            local_path: result.local_path
        };
    }

    /**
     * Upload video with optimized settings
     */
    async uploadVideo(
        buffer: Buffer,
        options: HybridUploadOptions = {}
    ): Promise<HybridUploadResult> {
        const videoOptions: HybridUploadOptions = {
            resource_type: 'video',
            folder: 'script-videos',
            format: 'mp4',
            quality: 'auto',
            ...options
        };

        return await this.uploadFile(buffer, videoOptions);
    }

    /**
     * Check file storage location and get info
     */
    async getFileInfo(public_id: string, folder?: string): Promise<{
        exists: boolean;
        storage_type?: 'cloudinary' | 'local';
        info?: HybridUploadResult;
    }> {
        try {
            // First check local storage
            const localInfo = await localFileStorage.getFileInfo(public_id, folder);
            if (localInfo) {
                return {
                    exists: true,
                    storage_type: 'local',
                    info: {
                        public_id: localInfo.public_id,
                        secure_url: localInfo.secure_url,
                        url: localInfo.url,
                        bytes: localInfo.bytes,
                        created_at: localInfo.created_at,
                        storage_type: 'local',
                        is_local: true,
                        local_path: localInfo.local_path
                    }
                };
            }

            // If not found locally, it might be on Cloudinary
            // (We can't easily check Cloudinary without making an API call)
            return {
                exists: false
            };
        } catch (error) {
            console.error('Error checking file info:', error);
            return {
                exists: false
            };
        }
    }

    /**
     * Delete file from appropriate storage
     */
    async deleteFile(public_id: string, folder?: string): Promise<boolean> {
        try {
            // Check if file exists locally first
            const fileInfo = await this.getFileInfo(public_id, folder);
            
            if (fileInfo.exists && fileInfo.storage_type === 'local') {
                return await localFileStorage.deleteFile(public_id, folder);
            } else {
                // Try to delete from Cloudinary
                try {
                    await cloudinaryService.deleteFile(public_id, 'video');
                    return true;
                } catch (error) {
                    console.error('Error deleting from Cloudinary:', error);
                    return false;
                }
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{
        local: {
            fileCount: number;
            totalSize: number;
            formattedSize: string;
        };
        cloudinary: {
            configured: boolean;
        };
    }> {
        const localStats = await localFileStorage.getStorageStats();
        
        return {
            local: localStats,
            cloudinary: {
                configured: cloudinaryService.isConfigured()
            }
        };
    }

    /**
     * Cleanup old local files
     */
    async cleanupLocalFiles(olderThanDays = 30): Promise<number> {
        return await localFileStorage.cleanupOldFiles('videos', olderThanDays);
    }
}

// Export a singleton instance
export const hybridUploadService = new HybridUploadService();

// Export the class for custom instances
export { HybridUploadService }; 