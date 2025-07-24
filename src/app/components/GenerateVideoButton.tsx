'use client';

import { useState } from 'react';

interface GenerateVideoButtonProps {
    scriptId: number;
    existingVideoUrl?: string | null;
    hasAudio: boolean;
    onVideoGenerated?: (videoUrl: string) => void;
    disabled?: boolean;
}

export default function GenerateVideoButton({
    scriptId,
    existingVideoUrl,
    hasAudio,
    onVideoGenerated,
    disabled = false
}: GenerateVideoButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

    const handleGenerateVideo = async () => {
        try {
            setIsGenerating(true);
            setError(null);

            const response = await fetch('/api/generate-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scriptId,
                    quality
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate video');
            }

            if (data.success && data.videoUrl) {
                onVideoGenerated?.(data.videoUrl);
            }

        } catch (err) {
            console.error('Error generating video:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate video');
        } finally {
            setIsGenerating(false);
        }
    };

    const watchVideo = () => {
        if (existingVideoUrl) {
            // Open video in new tab
            window.open(existingVideoUrl, '_blank');
        }
    };

    // If script doesn't have audio yet
    if (!hasAudio) {
        return (
            <div className="text-sm text-gray-500 italic">
                Generate audio first to create video
            </div>
        );
    }

    // If video already exists
    if (existingVideoUrl && !isGenerating) {
        return (
            <div className="flex items-center gap-3">
                <button
                    onClick={watchVideo}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-7-4v8a4 4 0 008 0v-8M7 6h10a4 4 0 014 4v8a4 4 0 01-4 4H7a4 4 0 01-4-4v-8a4 4 0 014-4z" />
                    </svg>
                    Watch Video
                </button>

                <button
                    onClick={handleGenerateVideo}
                    disabled={disabled || isGenerating}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate video with new stock footage"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                </button>
            </div>
        );
    }

    // Generate video button
    return (
        <div className="space-y-3">
            {/* Quality selector */}
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                    Quality:
                </label>
                <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
                    disabled={isGenerating}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                    <option value="low">Low (Fast)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Best Quality)</option>
                </select>
            </div>

            <button
                onClick={handleGenerateVideo}
                disabled={disabled || isGenerating}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
            >
                {isGenerating ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Generate Video
                    </>
                )}
            </button>

            {/* Progress info during generation */}
            {isGenerating && (
                <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span>Finding relevant stock videos...</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                        This may take 2-5 minutes depending on video length
                    </div>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <div className="font-medium">Video generation failed</div>
                            <div className="text-xs mt-1">{error}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 