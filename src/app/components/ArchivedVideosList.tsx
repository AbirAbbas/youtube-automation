'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/app/components/ui/Button';
import StatusBadge from '@/app/components/ui/StatusBadge';

interface ArchivedVideo {
    scheduledVideo: {
        id: number;
        title: string;
        description: string;
        scheduledFor: string;
        status: string;
        youtubeVideoId?: string;
        youtubeVideoUrl?: string;
        updatedAt: string;
    };
    script: {
        id: number;
        title: string;
        estimatedLength: string;
        isArchived: boolean;
        audioUrl?: string;
        videoUrl?: string;
        thumbnailPath?: string;
    };
}

interface ArchivedVideosListProps {
    channelId: number;
}

export default function ArchivedVideosList({ channelId }: ArchivedVideosListProps) {
    const [archivedVideos, setArchivedVideos] = useState<ArchivedVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState<number | null>(null);

    useEffect(() => {
        fetchArchivedVideos();
    }, [channelId]);

    const fetchArchivedVideos = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/archived-videos?channelId=${channelId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch archived videos');
            }

            setArchivedVideos(data.archivedVideos || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch archived videos');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (scriptId: number) => {
        try {
            setRestoring(scriptId);

            const response = await fetch('/api/archived-videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'restore',
                    scriptId: scriptId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to restore video');
            }

            // Remove the restored video from the list
            setArchivedVideos(prev => prev.filter(video => video.script.id !== scriptId));

            // Show success message (you could add a toast notification here)
            console.log('Video restored successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to restore video');
        } finally {
            setRestoring(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading archived videos...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
            </div>
        );
    }

    if (archivedVideos.length === 0) {
        return (
            <div className="p-8 text-center bg-white border border-gray-200 rounded-lg">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No archived videos</h3>
                <p className="text-gray-500">
                    Videos will be automatically archived after successful YouTube upload.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-2 text-2xl">📦</span>
                    Archived Videos ({archivedVideos.length})
                </h2>
                <Button
                    variant="secondary-ghost"
                    onClick={fetchArchivedVideos}
                    disabled={loading}
                >
                    <span className="mr-2">🔄</span>
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedVideos.map((video) => (
                    <div key={video.scheduledVideo.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold line-clamp-2 mb-2">
                                    {video.scheduledVideo.title}
                                </h3>
                                <div className="space-y-1 text-sm text-gray-500">
                                    {video.script.estimatedLength && (
                                        <div className="flex items-center">
                                            <span className="mr-1">⏱️</span>
                                            {video.script.estimatedLength}
                                        </div>
                                    )}
                                    <div className="flex items-center">
                                        <span className="mr-1">📅</span>
                                        Archived: {formatDate(video.scheduledVideo.updatedAt)}
                                    </div>
                                </div>
                            </div>
                            <StatusBadge status={video.scheduledVideo.status} />
                        </div>

                        {video.scheduledVideo.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                {video.scheduledVideo.description}
                            </p>
                        )}

                        {video.scheduledVideo.youtubeVideoUrl && (
                            <div className="mb-4">
                                <a
                                    href={video.scheduledVideo.youtubeVideoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                >
                                    <span className="mr-1">👁️</span>
                                    View on YouTube
                                </a>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="secondary-ghost"
                                size="sm"
                                onClick={() => handleRestore(video.script.id)}
                                disabled={restoring === video.script.id}
                                className="flex-1"
                            >
                                {restoring === video.script.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                                ) : (
                                    <span className="mr-1">🔄</span>
                                )}
                                Restore
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 