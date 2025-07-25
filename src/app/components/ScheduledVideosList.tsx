'use client';

import { useState, useEffect } from 'react';
import { YoutubeChannel } from '@/lib/db/schema';

interface ScheduledVideosListProps {
    channel: YoutubeChannel;
    className?: string;
}

interface ScheduledVideo {
    id: number;
    title: string;
    description: string;
    tags: string[];
    scheduledFor: string;
    status: 'scheduled' | 'uploaded' | 'failed';
    youtubeVideoUrl?: string;
    uploadError?: string;
}

export default function ScheduledVideosList({
    channel,
    className = ''
}: ScheduledVideosListProps) {
    const [scheduledVideos, setScheduledVideos] = useState<ScheduledVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchScheduledVideos();
    }, [channel.id]);

    const fetchScheduledVideos = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`/api/scheduled-videos?channelId=${channel.id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch scheduled videos');
            }

            setScheduledVideos(data.scheduledVideos);
        } catch (err) {
            console.error('Error fetching scheduled videos:', err);
            setError(err instanceof Error ? err.message : 'Failed to load scheduled videos');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'text-blue-600 dark:text-blue-400';
            case 'uploaded':
                return 'text-green-600 dark:text-green-400';
            case 'failed':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'scheduled':
                return '⏰';
            case 'uploaded':
                return '✅';
            case 'failed':
                return '❌';
            default:
                return '❓';
        }
    };

    if (loading) {
        return (
            <div className={`${className}`}>
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading scheduled videos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${className}`}>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    <button
                        onClick={fetchScheduledVideos}
                        className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (scheduledVideos.length === 0) {
        return (
            <div className={`${className}`}>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No videos scheduled for this channel
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Scheduled Videos ({scheduledVideos.length})
            </h3>

            <div className="space-y-3">
                {scheduledVideos.map((video) => (
                    <div
                        key={video.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{getStatusIcon(video.status)}</span>
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {video.title}
                                    </h4>
                                    <span className={`text-xs font-medium ${getStatusColor(video.status)}`}>
                                        {video.status}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {video.description.substring(0, 150)}...
                                </p>

                                <div className="flex flex-wrap gap-1 mb-2">
                                    {video.tags.slice(0, 5).map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    {video.tags.length > 5 && (
                                        <span className="text-xs text-gray-500">
                                            +{video.tags.length - 5} more
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Scheduled for: {new Date(video.scheduledFor).toLocaleString()}
                                </p>

                                {video.youtubeVideoUrl && (
                                    <a
                                        href={video.youtubeVideoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mt-2"
                                    >
                                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                        </svg>
                                        View on YouTube
                                    </a>
                                )}

                                {video.uploadError && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        Error: {video.uploadError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 