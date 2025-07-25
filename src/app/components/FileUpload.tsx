'use client';

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { validateFile } from '@/lib/upload-utils';
import { useLocalUpload } from '@/lib/hooks/useCloudinaryUpload';

interface FileUploadProps {
    onUploadSuccess?: (result: any) => void;
    onUploadError?: (error: string) => void;
    acceptedTypes?: 'image' | 'audio' | 'any';
    maxSizeInMB?: number;
    folder?: string;
    className?: string;
}

export default function FileUpload({
    onUploadSuccess,
    onUploadError,
    acceptedTypes = 'any',
    maxSizeInMB = 10,
    folder,
    className = '',
}: FileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFile, isUploading, error, result, progress, reset } = useLocalUpload();

    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        // Validate file
        const validation = validateFile(file, {
            allowedTypes: acceptedTypes,
            maxSizeInMB,
        });

        if (!validation.isValid) {
            const errorMessage = validation.errors.join(', ');
            onUploadError?.(errorMessage);
            return;
        }

        try {
            reset(); // Clear any previous errors
            const uploadResult = await uploadFile(file, {
                type: acceptedTypes !== 'any' ? acceptedTypes : 'auto',
                folder,
            });

            onUploadSuccess?.(uploadResult);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            onUploadError?.(errorMessage);
        }
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    const getAcceptAttribute = () => {
        switch (acceptedTypes) {
            case 'image':
                return 'image/*';
            case 'audio':
                return 'audio/*';
            default:
                return '*/*';
        }
    };

    const getUploadText = () => {
        switch (acceptedTypes) {
            case 'image':
                return 'Upload images';
            case 'audio':
                return 'Upload audio files';
            default:
                return 'Upload files';
        }
    };

    return (
        <div className={`w-full ${className}`}>
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={getAcceptAttribute()}
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="space-y-2">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-gray-600">Uploading... {progress}%</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-4xl">📁</div>
                        <p className="text-lg font-medium text-gray-700">
                            {getUploadText()}
                        </p>
                        <p className="text-sm text-gray-500">
                            Drag and drop files here, or{' '}
                            <button
                                type="button"
                                onClick={openFileDialog}
                                className="text-blue-600 hover:text-blue-800 underline"
                            >
                                browse
                            </button>
                        </p>
                        <p className="text-xs text-gray-400">
                            Max size: {maxSizeInMB}MB
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                    File uploaded successfully to local storage!
                </div>
            )}
        </div>
    );
} 