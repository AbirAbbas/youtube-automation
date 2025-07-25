export interface ArchiveConfig {
    // Whether to automatically archive videos after upload
    autoArchive: boolean;
    
    // Whether to archive the video script
    archiveScript: boolean;
    
    // Whether to archive generated files (audio, video, thumbnail)
    archiveFiles: boolean;
    
    // Whether to keep metadata for future reference
    keepMetadata: boolean;
    
    // Delay in minutes before archiving (0 = immediate)
    archiveDelayMinutes: number;
    
    // Whether to archive failed uploads
    archiveFailedUploads: boolean;
}

export const defaultArchiveConfig: ArchiveConfig = {
    autoArchive: true,
    archiveScript: true,
    archiveFiles: true,
    keepMetadata: true,
    archiveDelayMinutes: 0, // Archive immediately after upload
    archiveFailedUploads: false
};

export class ArchiveConfigManager {
    private static instance: ArchiveConfigManager;
    private config: ArchiveConfig;

    private constructor() {
        this.config = { ...defaultArchiveConfig };
        this.loadConfig();
    }

    public static getInstance(): ArchiveConfigManager {
        if (!ArchiveConfigManager.instance) {
            ArchiveConfigManager.instance = new ArchiveConfigManager();
        }
        return ArchiveConfigManager.instance;
    }

    public getConfig(): ArchiveConfig {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<ArchiveConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    public resetToDefaults(): void {
        this.config = { ...defaultArchiveConfig };
        this.saveConfig();
    }

    private loadConfig(): void {
        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('archiveConfig');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    this.config = { ...defaultArchiveConfig, ...parsed };
                }
            }
        } catch (error) {
            console.warn('Failed to load archive config, using defaults:', error);
        }
    }

    private saveConfig(): void {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('archiveConfig', JSON.stringify(this.config));
            }
        } catch (error) {
            console.warn('Failed to save archive config:', error);
        }
    }
}

export const archiveConfigManager = ArchiveConfigManager.getInstance(); 