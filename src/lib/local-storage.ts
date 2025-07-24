import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';

export interface LocalStorageOptions {
    folder?: string;
    public_id?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface LocalStorageResult {
    public_id: string;
    secure_url: string;
    url: string;
    local_path: string;
    bytes: number;
    created_at: string;
    is_local: true;
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
     * Save a video file locally
     */
    async saveVideo(
        buffer: Buffer,
        options: LocalStorageOptions = {}
    ): Promise<LocalStorageResult> {
        try {
            await this.ensureBaseDir();

            const {
                folder = 'videos',
                public_id = this.generatePublicId(),
                tags = [],
                metadata = {}
            } = options;

            // Create folder structure
            const folderPath = path.join(this.baseDir, folder);
            await fs.mkdir(folderPath, { recursive: true });

            // Generate filename with .mp4 extension
            const filename = `${public_id}.mp4`;
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
                is_local: true
            };

        } catch (error) {
            console.error('Error saving file locally:', error);
            throw new Error(`Failed to save file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get file information from local storage
     */
    async getFileInfo(public_id: string, folder = 'videos'): Promise<LocalStorageResult | null> {
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
                is_local: true
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if a file exists locally
     */
    async fileExists(public_id: string, folder = 'videos'): Promise<boolean> {
        try {
            const filePath = path.join(this.baseDir, folder, `${public_id}.mp4`);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file buffer from local storage
     */
    async getFileBuffer(public_id: string, folder = 'videos'): Promise<Buffer | null> {
        try {
            const filePath = path.join(this.baseDir, folder, `${public_id}.mp4`);
            return await fs.readFile(filePath);
        } catch {
            return null;
        }
    }

    /**
     * Delete a file from local storage
     */
    async deleteFile(public_id: string, folder = 'videos'): Promise<boolean> {
        try {
            const filePath = path.join(this.baseDir, folder, `${public_id}.mp4`);
            const metadataFilePath = path.join(this.baseDir, folder, `${public_id}.meta.json`);

            await fs.unlink(filePath);
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
    async listFiles(folder = 'videos'): Promise<LocalStorageResult[]> {
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
    async cleanupOldFiles(folder = 'videos', olderThanDays = 30): Promise<number> {
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
    async getStorageStats(folder = 'videos'): Promise<{
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
        return `video-${timestamp}-${random}`;
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