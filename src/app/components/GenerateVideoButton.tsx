'use client';

import { useState } from 'react';
import Button from './ui/Button';
import { getTopicIcon } from '@/lib/topic-icon-mapper';

interface GenerateVideoButtonProps {
    scriptId: number;
    existingVideoUrl?: string;
    hasAudio: boolean;
    onVideoGenerated?: (videoUrl: string) => void;
    disabled?: boolean;
    videoTitle?: string; // Add video title prop
    topic?: string; // Add topic prop for icon mapping
}

export default function GenerateVideoButton({
    scriptId,
    existingVideoUrl,
    hasAudio,
    onVideoGenerated,
    disabled = false,
    videoTitle = 'AUDIO', // Use video title as default, fallback to 'AUDIO'
    topic
}: GenerateVideoButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
    const [videoMode, setVideoMode] = useState<'stock' | 'subtitle'>('subtitle'); // Default to subtitle mode
    const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
    const [fontSize, setFontSize] = useState(48); // Default size for icons to be clearly visible
    const [customText, setCustomText] = useState(topic ? getTopicIcon(topic) : '📹'); // Use topic icon as default display text

    const handleGenerateVideo = async () => {
        try {
            setIsGenerating(true);
            setError(null);

            // Choose API endpoint based on video mode
            const endpoint = videoMode === 'subtitle' ? '/api/generate-subtitle-video' : '/api/generate-video';

            // Prepare request body based on video mode
            const requestBody = videoMode === 'subtitle'
                ? { scriptId, quality, backgroundColor, fontSize, customText }
                : { scriptId, quality };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
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
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                    <div className="text-yellow-600 dark:text-yellow-400">🎤</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                        Generate audio first to create video
                    </div>
                </div>
            </div>
        );
    }

    // If video already exists
    if (existingVideoUrl && !isGenerating) {
        return (
            <div className="flex flex-col gap-2">
                <Button
                    variant="success"
                    size="sm"
                    onClick={watchVideo}
                    className="w-full"
                >
                    🎬 Watch Video
                </Button>
                <Button
                    variant="primary-ghost"
                    size="sm"
                    onClick={handleGenerateVideo}
                    disabled={disabled || isGenerating}
                    className="w-full"
                >
                    🔄 Regenerate Video
                </Button>
            </div>
        );
    }

    // Generate video button
    return (
        <div className="space-y-3">
            {/* Video Mode selector */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100">
                    Video Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setVideoMode('subtitle')}
                        disabled={isGenerating}
                        className={`p-2 text-xs rounded-lg border transition-all ${videoMode === 'subtitle'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        📝 Subtitle Video
                    </button>
                    <button
                        type="button"
                        onClick={() => setVideoMode('stock')}
                        disabled={isGenerating}
                        className={`p-2 text-xs rounded-lg border transition-all ${videoMode === 'stock'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        🎞️ Stock Footage
                    </button>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                    {videoMode === 'subtitle' && '📝 Simple text overlay video - fast and clean'}
                    {videoMode === 'stock' && '🎞️ AI-selected stock footage - more complex'}
                </div>
            </div>

            {/* Quality selector */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 space-y-2">
                <label className="block text-sm font-medium text-purple-900 dark:text-purple-100">
                    Video Quality:
                </label>
                <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
                    disabled={isGenerating}
                    className="w-full text-sm border border-purple-300 dark:border-purple-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="low">Low Quality (Fast)</option>
                    <option value="medium">Medium Quality (Balanced)</option>
                    <option value="high">High Quality (Best)</option>
                </select>
                <div className="text-xs text-purple-700 dark:text-purple-300">
                    {quality === 'low' && '⚡ Fast processing, smaller file size'}
                    {quality === 'medium' && '⚖️ Balanced quality and speed'}
                    {quality === 'high' && '✨ Best quality, slower processing'}
                </div>
            </div>

            {/* Subtitle-specific options */}
            {videoMode === 'subtitle' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                            Background Color:
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                disabled={isGenerating}
                                className="w-8 h-8 rounded border border-green-300 dark:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <input
                                type="text"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                disabled={isGenerating}
                                placeholder="#1a1a1a"
                                className="flex-1 text-sm border border-green-300 dark:border-green-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                            Icon Size: {fontSize}px
                        </label>
                        <input
                            type="range"
                            min="24"
                            max="72"
                            step="4"
                            value={fontSize}
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                            disabled={isGenerating}
                            className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex justify-between text-xs text-green-700 dark:text-green-300 mt-1">
                            <span>Small</span>
                            <span>Large</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                            Display Icon:
                        </label>
                        <input
                            type="text"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            disabled={isGenerating}
                            placeholder="Enter emoji or text to display..."
                            className="w-full text-sm border border-green-300 dark:border-green-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                            {topic ? `Topic icon: ${getTopicIcon(topic)}` : 'This icon/text will appear centered on the video'}
                        </div>
                    </div>
                </div>
            )}

            <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateVideo}
                disabled={disabled || isGenerating}
                isLoading={isGenerating}
                loadingText={videoMode === 'subtitle' ? 'Creating subtitle video...' : 'Generating video...'}
                className="w-full"
            >
                {videoMode === 'subtitle' ? '📝 Create Subtitle Video' : '🎬 Generate Stock Video'}
            </Button>

            {/* Progress info during generation */}
            {isGenerating && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                            {videoMode === 'subtitle'
                                ? 'Creating synchronized subtitles...'
                                : 'Finding relevant stock videos...'
                            }
                        </span>
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                        {videoMode === 'subtitle'
                            ? 'This usually takes 30-60 seconds'
                            : 'This may take 2-5 minutes depending on video length and quality settings'
                        }
                    </div>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <div className="text-red-500 text-sm">⚠️</div>
                        <div className="text-red-700 dark:text-red-300 text-sm">
                            <div className="font-medium">Video generation failed</div>
                            <div className="text-xs mt-1">{error}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info message */}
            {!isGenerating && !existingVideoUrl && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
                    <div className="text-xs text-purple-700 dark:text-purple-300">
                        {videoMode === 'subtitle' ? (
                            <>📝 <strong>Simple & Fast:</strong> Creates video with text overlays synchronized to your audio</>
                        ) : (
                            <>✨ <strong>AI-Generated:</strong> Creates videos automatically using relevant stock footage from Pexels</>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 