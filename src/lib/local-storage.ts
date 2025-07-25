import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';

export interface LocalStorageOptions {
    folder?: string;
    public_id?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    resource_type?: 'image' | 'video' | 'audio' | 'raw' | 'auto';
    format?: string;
    quality?: string | number;
}

export interface LocalStorageResult {
    public_id: string;
    secure_url: string;
    url: string;
    local_path: string;
    bytes: number;
    created_at: string;
    is_local: true;
    format?: string;
    width?: number;
    height?: number;
    duration?: number;
    resource_type?: 'image' | 'video' | 'audio' | 'raw' | 'auto';
}

export class LocalFileStorage {
    private baseDir: string;
    private publicBaseUrl: string;

    constructor() {
        // Store files in the public directory for easy serving
        this.baseDir = path.join(process.cwd(), 'public', 'uploads');
        this.publicBaseUrl = '/api/local-files';
        this.ensureBaseDir();
    }

    /**
     * Ensure base directory exists
     */
    private async ensureBaseDir(): Promise<void> {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
        } catch (error) {
            console.error('Error creating local storage directory:', error);
            throw new Error('Failed to initialize local storage');
        }
    }

    /**
     * Save any file locally with automatic type detection
     */
    async saveFile(
        buffer: Buffer,
        options: LocalStorageOptions = {}
    ): Promise<LocalStorageResult> {
        try {
            await this.ensureBaseDir();

            const {
                folder = 'uploads',
                public_id = this.generatePublicId(),
                tags = [],
                metadata = {},
                resource_type = 'auto',
                format
            } = options;

            // Detect file type if not specified
            const detectedType = resource_type === 'auto' ? this.detectFileType(buffer) : resource_type;
            const fileExtension = format || this.getDefaultExtension(detectedType);

            // Create folder structure
            const folderPath = path.join(this.baseDir, folder);
            await fs.mkdir(folderPath, { recursive: true });

            // Generate filename with appropriate extension
            const filename = `${public_id}.${fileExtension}`;
            const filePath = path.join(folderPath, filename);

            // Save the file
            await fs.writeFile(filePath, buffer);

            // Create metadata file
            const metadataFilePath = path.join(folderPath, `${public_id}.meta.json`);
            const metadataInfo = {
                public_id,
                filename,
                folder,
                tags,
                bytes: buffer.length,
                created_at: new Date().toISOString(),
                resource_type: detectedType,
                format: fileExtension,
                ...metadata
            };
            await fs.writeFile(metadataFilePath, JSON.stringify(metadataInfo, null, 2));

            const relativePath = path.join(folder, filename);
            const secure_url = `${this.publicBaseUrl}/${relativePath}`;

            console.log(`✅ File saved locally: ${filePath} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);

            return {
                public_id,
                secure_url,
                url: secure_url,
                local_path: filePath,
                bytes: buffer.length,
                created_at: metadataInfo.created_at,
                is_local: true,
                format: fileExtension,
                resource_type: detectedType
            };

        } catch (error) {
            console.error('Error saving file locally:', error);
            throw new Error(`Failed to save file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Save an image file locally
     */
    async saveImage(
        buffer: Buffer,
        options: LocalStorageOptions = {}
    ): Promise<LocalStorageResult> {
        return this.saveFile(buffer, {
            ...options,
            resource_type: 'image',
            folder: options.folder || 'images'
        });
    }

    /**
     * Save an audio file locally
     */
    async saveAudio(
        buffer: Buffer,
        options: LocalStorageOptions = {}
    ): Promise<LocalStorageResult> {
        return this.saveFile(buffer, {
            ...options,
            resource_type: 'audio',
            folder: options.folder || 'audio'
        });
    }

    /**
     * Save a video file locally
     */
    async saveVideo(
        buffer: Buffer,
        options: LocalStorageOptions = {}
    ): Promise<LocalStorageResult> {
        return this.saveFile(buffer, {
            ...options,
            resource_type: 'video',
            folder: options.folder || 'videos'
        });
    }

    /**
     * Detect file type from buffer
     */
    private detectFileType(buffer: Buffer): 'image' | 'video' | 'audio' | 'raw' {
        // Check for common file signatures
        const header = buffer.slice(0, 12);

        // Image formats
        if (header.slice(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) return 'image'; // JPEG
        if (header.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image'; // PNG
        if (header.slice(0, 6).equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])) ||
            header.slice(0, 6).equals(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))) return 'image'; // GIF
        if (header.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
            header.slice(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))) return 'image'; // WebP

        // Video formats
        if (header.slice(4, 8).equals(Buffer.from([0x66, 0x74, 0x79, 0x70]))) return 'video'; // MP4
        if (header.slice(0, 4).equals(Buffer.from([0x1A, 0x45, 0xDF, 0xA3]))) return 'video'; // WebM
        if (header.slice(0, 4).equals(Buffer.from([0x00, 0x00, 0x01, 0xBA]))) return 'video'; // MPEG

        // Audio formats
        if (header.slice(0, 3).equals(Buffer.from([0x49, 0x44, 0x33]))) return 'audio'; // MP3
        if (header.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
            header.slice(8, 12).equals(Buffer.from([0x57, 0x41, 0x56, 0x45]))) return 'audio'; // WAV
        if (header.slice(0, 4).equals(Buffer.from([0x4D, 0x34, 0x41, 0x20]))) return 'audio'; // M4A

        // Default to raw if unknown
        return 'raw';
    }

    /**
     * Get default file extension for file type
     */
    private getDefaultExtension(resourceType: string): string {
        switch (resourceType) {
            case 'image':
                return 'jpg';
            case 'video':
                return 'mp4';
            case 'audio':
                return 'mp3';
            default:
                return 'bin';
        }
    }

    /**
     * Get file information from local storage
     */
    async getFileInfo(public_id: string, folder = 'uploads'): Promise<LocalStorageResult | null> {
        try {
            const metadataFilePath = path.join(this.baseDir, folder, `${public_id}.meta.json`);
            const metadataContent = await fs.readFile(metadataFilePath, 'utf-8');
            const metadata = JSON.parse(metadataContent);

            const relativePath = path.join(folder, metadata.filename);
            const secure_url = `${this.publicBaseUrl}/${relativePath}`;

            return {
                public_id: metadata.public_id,
                secure_url,
                url: secure_url,
                local_path: path.join(this.baseDir, folder, metadata.filename),
                bytes: metadata.bytes,
                created_at: metadata.created_at,
                is_local: true,
                format: metadata.format,
                resource_type: metadata.resource_type
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if a file exists locally
     */
    async fileExists(public_id: string, folder = 'uploads'): Promise<boolean> {
        try {
            const metadataFilePath = path.join(this.baseDir, folder, `${public_id}.meta.json`);
            await fs.access(metadataFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file buffer from local storage
     */
    async getFileBuffer(public_id: string, folder = 'uploads'): Promise<Buffer | null> {
        try {
            const fileInfo = await this.getFileInfo(public_id, folder);
            if (!fileInfo) return null;

            return await fs.readFile(fileInfo.local_path);
        } catch {
            return null;
        }
    }

    /**
     * Delete a file from local storage
     */
    async deleteFile(public_id: string, folder = 'uploads'): Promise<boolean> {
        try {
            const fileInfo = await this.getFileInfo(public_id, folder);
            if (!fileInfo) return false;

            const metadataFilePath = path.join(this.baseDir, folder, `${public_id}.meta.json`);

            await fs.unlink(fileInfo.local_path);
            await fs.unlink(metadataFilePath);

            console.log(`🗑️ Deleted local file: ${public_id}`);
            return true;
        } catch (error) {
            console.error('Error deleting local file:', error);
            return false;
        }
    }

    /**
     * List all files in a folder
     */
    async listFiles(folder = 'uploads'): Promise<LocalStorageResult[]> {
        try {
            const folderPath = path.join(this.baseDir, folder);
            const files = await fs.readdir(folderPath);

            const metadataFiles = files.filter(file => file.endsWith('.meta.json'));
            const results: LocalStorageResult[] = [];

            for (const metaFile of metadataFiles) {
                const public_id = metaFile.replace('.meta.json', '');
                const fileInfo = await this.getFileInfo(public_id, folder);
                if (fileInfo) {
                    results.push(fileInfo);
                }
            }

            return results.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        } catch {
            return [];
        }
    }

    /**
     * Clean up old files (older than specified days)
     */
    async cleanupOldFiles(folder = 'uploads', olderThanDays = 30): Promise<number> {
        try {
            const files = await this.listFiles(folder);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            let deletedCount = 0;

            for (const file of files) {
                const fileDate = new Date(file.created_at);
                if (fileDate < cutoffDate) {
                    if (await this.deleteFile(file.public_id, folder)) {
                        deletedCount++;
                    }
                }
            }

            console.log(`🧹 Cleaned up ${deletedCount} old files from ${folder}`);
            return deletedCount;
        } catch (error) {
            console.error('Error during cleanup:', error);
            return 0;
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(folder = 'uploads'): Promise<{
        fileCount: number;
        totalSize: number;
        formattedSize: string;
    }> {
        try {
            const files = await this.listFiles(folder);
            const totalSize = files.reduce((sum, file) => sum + file.bytes, 0);

            return {
                fileCount: files.length,
                totalSize,
                formattedSize: this.formatBytes(totalSize)
            };
        } catch {
            return {
                fileCount: 0,
                totalSize: 0,
                formattedSize: '0 B'
            };
        }
    }

    /**
     * Generate a unique public ID
     */
    private generatePublicId(): string {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `file-${timestamp}-${random}`;
    }

    /**
     * Format bytes to human readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get the base directory path
     */
    getBaseDir(): string {
        return this.baseDir;
    }
}

// Export a singleton instance
export const localFileStorage = new LocalFileStorage();

// Export the class for custom instances
export { LocalFileStorage }; 