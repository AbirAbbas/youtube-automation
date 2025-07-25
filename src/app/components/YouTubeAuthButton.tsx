'use client';

import { useState } from 'react';
import { YoutubeChannel } from '@/lib/db/schema';

interface YouTubeAuthButtonProps {
    channel: YoutubeChannel;
    onAuthSuccess?: (channel: YoutubeChannel) => void;
    className?: string;
}

export default function YouTubeAuthButton({
    channel,
    onAuthSuccess,
    className = ''
}: YouTubeAuthButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConnect = async () => {
        if (loading) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/youtube', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channelId: channel.id
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate authorization URL');
            }

            // Redirect to YouTube OAuth
            window.location.href = data.authUrl;

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect to YouTube');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (loading) return;

        // TODO: Implement disconnect functionality
        // This would involve revoking tokens and updating the database
        console.log('Disconnect functionality not yet implemented');
    };

    if (channel.isAuthenticated) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 dark:text-green-400">
                        Connected to YouTube
                    </span>
                </div>
                <button
                    onClick={handleDisconnect}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                    disabled={loading}
                >
                    Disconnect
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
                onClick={handleConnect}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        Connect to YouTube
                    </>
                )}
            </button>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Connect this channel to YouTube to enable direct uploads
            </p>
        </div>
    );
} 