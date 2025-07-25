'use client';

import { useState } from 'react';
import { VideoScript, YoutubeChannel } from '@/lib/db/schema';

interface AutomatedYouTubeUploadButtonProps {
    script: VideoScript;
    channel: YoutubeChannel;
    onUploadSuccess?: (result: any) => void;
    className?: string;
}

export default function AutomatedYouTubeUploadButton({
    script,
    channel,
    onUploadSuccess,
    className = ''
}: AutomatedYouTubeUploadButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [scheduledInfo, setScheduledInfo] = useState<any>(null);

    const canUpload = script.videoUrl && channel.isAuthenticated;

    const handleAutomatedUpload = async () => {
        if (!canUpload || loading) return;

        setLoading(true);
        setError('');
        setScheduledInfo(null);

        try {
            const response = await fetch('/api/automated-youtube-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scriptId: script.id,
                    channelId: channel.id
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to schedule automated upload');
            }

            setScheduledInfo(data);
            onUploadSuccess?.(data);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to schedule upload');
        } finally {
            setLoading(false);
        }
    };

    if (!canUpload) {
        let reason = '';
        if (!script.videoUrl) {
            reason = 'No video generated';
        } else if (!channel.isAuthenticated) {
            reason = 'Channel not connected to YouTube';
        }

        return (
            <div className={`${className}`}>
                <button
                    disabled
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    🤖 Auto Upload
                </button>
                <p className="mt-1 text-xs text-gray-500">
                    {reason}
                </p>
            </div>
        );
    }

    if (scheduledInfo) {
        return (
            <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 ${className}`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="text-green-600 dark:text-green-400">✅</div>
                    <div className="text-sm font-medium text-green-800 dark:text-green-200">
                        Video Scheduled!
                    </div>
                </div>
                <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                    <div><strong>Title:</strong> {scheduledInfo.generatedContent.title}</div>
                    <div><strong>Scheduled for:</strong> {new Date(scheduledInfo.scheduledFor).toLocaleString()}</div>
                    <div><strong>Status:</strong> {scheduledInfo.status}</div>
                    <div><strong>Video ID:</strong> {scheduledInfo.videoId}</div>
                </div>
                <button
                    onClick={() => setScheduledInfo(null)}
                    className="mt-2 text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                    Schedule Another
                </button>
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            {error && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            <button
                onClick={handleAutomatedUpload}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Scheduling...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        🤖 Auto Upload
                    </>
                )}
            </button>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                AI generates content & uploads with YouTube scheduling
            </p>
        </div>
    );
} 