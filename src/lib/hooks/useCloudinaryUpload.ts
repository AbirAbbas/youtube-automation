import { useState, useCallback } from 'react';

export interface UploadOptions {
    type?: 'image' | 'audio' | 'auto';
    folder?: string;
    quality?: string;
    width?: string;
    height?: string;
}

export interface UploadState {
    isUploading: boolean;
    error: string | null;
    result: any;
    progress: number;
}

export function useLocalUpload() {
    const [uploadState, setUploadState] = useState<UploadState>({
        isUploading: false,
        error: null,
        result: null,
        progress: 0,
    });

    const uploadFile = useCallback(async (file: File, options: UploadOptions = {}) => {
        setUploadState({
            isUploading: true,
            error: null,
            result: null,
            progress: 0,
        });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', options.type || 'auto');

            if (options.folder) formData.append('folder', options.folder);
            if (options.quality) formData.append('quality', options.quality);
            if (options.width) formData.append('width', options.width);
            if (options.height) formData.append('height', options.height);

            // Simulate progress for better UX
            setUploadState(prev => ({ ...prev, progress: 25 }));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            setUploadState(prev => ({ ...prev, progress: 75 }));

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadState({
                isUploading: false,
                error: null,
                result: data.data,
                progress: 100,
            });

            return data.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            setUploadState({
                isUploading: false,
                error: errorMessage,
                result: null,
                progress: 0,
            });
            throw error;
        }
    }, []);

    const uploadFromUrl = useCallback(async (url: string, options: UploadOptions = {}) => {
        setUploadState({
            isUploading: true,
            error: null,
            result: null,
            progress: 0,
        });

        try {
            setUploadState(prev => ({ ...prev, progress: 25 }));

            const response = await fetch('/api/upload', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    uploadType: options.type || 'auto',
                    folder: options.folder,
                    quality: options.quality,
                    width: options.width ? parseInt(options.width) : undefined,
                    height: options.height ? parseInt(options.height) : undefined,
                }),
            });

            setUploadState(prev => ({ ...prev, progress: 75 }));

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadState({
                isUploading: false,
                error: null,
                result: data.data,
                progress: 100,
            });

            return data.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            setUploadState({
                isUploading: false,
                error: errorMessage,
                result: null,
                progress: 0,
            });
            throw error;
        }
    }, []);

    const reset = useCallback(() => {
        setUploadState({
            isUploading: false,
            error: null,
            result: null,
            progress: 0,
        });
    }, []);

    return {
        ...uploadState,
        uploadFile,
        uploadFromUrl,
        reset,
    };
}

// Export the old name for backward compatibility
export const useCloudinaryUpload = useLocalUpload; 