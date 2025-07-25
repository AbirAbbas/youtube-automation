'use client';

import { useState, useEffect } from 'react';
import { YoutubeChannel } from '@/lib/db/schema';
import YouTubeAuthButton from '@/app/components/YouTubeAuthButton';
import CreateChannelModal from '@/app/components/CreateChannelModal';
import ScheduledVideosList from '@/app/components/ScheduledVideosList';
import UploadProcessorStatus from '@/app/components/UploadProcessorStatus';

const ChannelsPage = () => {
    const [channels, setChannels] = useState<YoutubeChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/channels');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch channels');
            }

            setChannels(data.channels);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch channels');
        } finally {
            setLoading(false);
        }
    };

    const handleChannelCreated = (newChannel: YoutubeChannel) => {
        setChannels(prev => [newChannel, ...prev]);
        setShowCreateModal(false);
    };

    const handleAuthSuccess = () => {
        // Refresh channels to show updated auth status
        fetchChannels();
    };

    const formatDate = (date: string | Date) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading channels...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        <button
                            onClick={fetchChannels}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        📺 Channel Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Manage your YouTube channels and connect them for direct uploads
                    </p>

                    {/* Upload Processor Status */}
                    <div className="max-w-md mx-auto mb-6">
                        <UploadProcessorStatus />
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Channel
                    </button>
                </div>

                {/* Channels Grid */}
                {channels.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 max-w-md mx-auto border border-gray-100 dark:border-slate-700">
                            <div className="text-6xl mb-4">📺</div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                No Channels Yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Create your first channel to start generating and uploading videos
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Create First Channel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {channels.map((channel) => (
                            <div
                                key={channel.id}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                {/* Channel Header */}
                                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                {channel.name}
                                            </h3>
                                            {channel.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                                    {channel.description}
                                                </p>
                                            )}

                                            {/* Channel Stats */}
                                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                                                {channel.subscriberCount && (
                                                    <span>
                                                        👥 {channel.subscriberCount.toLocaleString()} subscribers
                                                    </span>
                                                )}
                                                <span>
                                                    📅 {formatDate(channel.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Avatar */}
                                        {channel.avatarUrl ? (
                                            <img
                                                src={channel.avatarUrl}
                                                alt={channel.name}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                                <span className="text-xl">📺</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Channel Actions */}
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {/* YouTube Authentication */}
                                        <YouTubeAuthButton
                                            channel={channel}
                                            onAuthSuccess={handleAuthSuccess}
                                        />

                                        {/* Channel Links */}
                                        {channel.channelUrl && (
                                            <a
                                                href={channel.channelUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                View Channel
                                            </a>
                                        )}

                                        {/* Upload Status */}
                                        {channel.lastUploadAt && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Last upload: {formatDate(channel.lastUploadAt)}
                                            </p>
                                        )}

                                        {/* Scheduled Videos */}
                                        {channel.isAuthenticated && (
                                            <ScheduledVideosList
                                                channel={channel}
                                                className="mt-4"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Channel Modal */}
                <CreateChannelModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onChannelCreated={handleChannelCreated}
                />
            </div>
        </main>
    );
};

export default ChannelsPage; 