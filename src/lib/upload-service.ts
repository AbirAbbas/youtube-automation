import { localFileStorage, LocalStorageResult, LocalStorageOptions } from './local-storage';
import { localStorageService, LocalStorageUploadResult, LocalStorageUploadOptions } from './local-storage-service';

export interface LocalUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    bytes: number;
    created_at: string;
    storage_type: 'local';
    is_local: true;
    local_path: string;
    format?: string;
    width?: number;
    height?: number;
    duration?: number;
    resource_type?: 'image' | 'video' | 'audio' | 'raw' | 'auto';
}

export interface LocalUploadOptions {
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

export class LocalUploadService {
    /**
     * Upload a file to local storage
     */
    async uploadFile(
        buffer: Buffer,
        options: LocalUploadOptions = {}
    ): Promise<LocalUploadResult> {
        const fileSize = buffer.length;
        const fileSizeMB = fileSize / 1024 / 1024;

        console.log(`📤 Uploading file to local storage: ${fileSizeMB.toFixed(2)}MB`);

        try {
            const result = await this.uploadToLocal(buffer, options);
            console.log('✅ Local storage upload successful');
            return result;
        } catch (error) {
            console.error('❌ Local storage upload failed:', error);
            throw error;
        }
    }

    /**
     * Upload an image file
     */
    async uploadImage(
        buffer: Buffer,
        options: LocalUploadOptions = {}
    ): Promise<LocalUploadResult> {
        return await localStorageService.uploadImage(buffer, options);
    }

    /**
     * Upload an audio file
     */
    async uploadAudio(
        buffer: Buffer,
        options: LocalUploadOptions = {}
    ): Promise<LocalUploadResult> {
        return await localStorageService.uploadAudio(buffer, options);
    }

    /**
     * Upload a video file
     */
    async uploadVideo(
        buffer: Buffer,
        options: LocalUploadOptions = {}
    ): Promise<LocalUploadResult> {
        return await localStorageService.uploadVideo(buffer, options);
    }

    /**
     * Upload specifically to local storage
     */
    private async uploadToLocal(
        buffer: Buffer,
        options: LocalUploadOptions
    ): Promise<LocalUploadResult> {
        const localOptions: LocalStorageOptions = {
            folder: options.folder || 'uploads',
            public_id: options.public_id,
            tags: options.tags,
            resource_type: options.resource_type,
            format: options.format,
            metadata: {
                quality: options.quality,
                width: options.width,
                height: options.height,
                crop: options.crop,
                gravity: options.gravity,
                transformation: options.transformation,
                resource_type: options.resource_type,
                ...options.metadata
            }
        };

        const result = await localFileStorage.saveFile(buffer, localOptions);

        return {
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            bytes: result.bytes,
            created_at: result.created_at,
            storage_type: 'local',
            is_local: true,
            local_path: result.local_path,
            format: result.format,
            resource_type: result.resource_type
        };
    }

    /**
     * Delete a file from local storage
     */
    async deleteFile(public_id: string, resource_type: string = 'auto'): Promise<boolean> {
        return await localStorageService.deleteFile(public_id, resource_type);
    }

    /**
     * Check file storage location and get info
     */
    async getFileInfo(public_id: string, folder?: string): Promise<{
        exists: boolean;
        storage_type: 'local';
        info?: LocalUploadResult;
    }> {
        try {
            const localInfo = await localFileStorage.getFileInfo(public_id, folder || 'uploads');
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
                        local_path: localInfo.local_path,
                        format: localInfo.format,
                        resource_type: localInfo.resource_type
                    }
                };
            }

            return {
                exists: false,
                storage_type: 'local'
            };
        } catch (error) {
            console.error('Error checking file info:', error);
            return {
                exists: false,
                storage_type: 'local'
            };
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<{
        local: {
            configured: boolean;
            fileCount: number;
            totalSize: number;
            formattedSize: string;
        };
    }> {
        const localStats = await localFileStorage.getStorageStats();

        return {
            local: {
                configured: true,
                fileCount: localStats.fileCount,
                totalSize: localStats.totalSize,
                formattedSize: localStats.formattedSize
            }
        };
    }

    /**
     * List all files in a folder
     */
    async listFiles(folder = 'uploads'): Promise<LocalUploadResult[]> {
        const files = await localFileStorage.listFiles(folder);

        return files.map(file => ({
            public_id: file.public_id,
            secure_url: file.secure_url,
            url: file.url,
            bytes: file.bytes,
            created_at: file.created_at,
            storage_type: 'local' as const,
            is_local: true,
            local_path: file.local_path,
            format: file.format,
            resource_type: file.resource_type
        }));
    }

    /**
     * Clean up old files
     */
    async cleanupOldFiles(folder = 'uploads', olderThanDays = 30): Promise<number> {
        return await localFileStorage.cleanupOldFiles(folder, olderThanDays);
    }
}

// Export a singleton instance
export const localUploadService = new LocalUploadService();

// Export the class for custom instances
export { LocalUploadService }; 