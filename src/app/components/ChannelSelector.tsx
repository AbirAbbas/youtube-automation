'use client';

import { useState, useEffect } from 'react';
import { YoutubeChannel } from '@/lib/db/schema';

interface ChannelSelectorProps {
    selectedChannelId?: number;
    onChannelSelect: (channelId: number) => void;
    className?: string;
    required?: boolean;
    renderInline?: boolean;
}

export default function ChannelSelector({
    selectedChannelId,
    onChannelSelect,
    className = '',
    required = false,
    renderInline = false
}: ChannelSelectorProps) {
    const [channels, setChannels] = useState<YoutubeChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

            // Only auto-select if no selectedChannelId in props and no value in localStorage
            const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedChannelId') : null;
            if (!selectedChannelId && !stored && data.channels.length > 0) {
                onChannelSelect(data.channels[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch channels');
        } finally {
            setLoading(false);
        }
    };

    const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const channelId = parseInt(e.target.value, 10);
        if (!isNaN(channelId)) {
            onChannelSelect(channelId);
        }
    };

    if (loading) {
        return (
            <div className={`${className}`}>
                {renderInline ? (
                    <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">Loading...</div>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            YouTube Channel
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700">
                            Loading channels...
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${className}`}>
                {renderInline ? (
                    <div className="px-2 py-1 text-xs text-red-500">Error loading channels</div>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            YouTube Channel
                        </label>
                        <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (channels.length === 0) {
        return (
            <div className={`${className}`}>
                {renderInline ? (
                    <div className="px-2 py-1 text-xs text-yellow-600">No channels</div>
                ) : (
                    <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            YouTube Channel
                        </label>
                        <div className="w-full px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
                            No channels found. Create a channel first.
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (renderInline) {
        return (
            <select
                value={selectedChannelId || ''}
                onChange={handleChannelChange}
                required={required}
                className="px-2 py-1 h-8 rounded bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minWidth: 140 }}
            >
                <option value="">Select channel...</option>
                {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                        {channel.name}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                YouTube Channel {required && <span className="text-red-500">*</span>}
            </label>
            <select
                value={selectedChannelId || ''}
                onChange={handleChannelChange}
                required={required}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
                <option value="">Select a channel...</option>
                {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                        {channel.name} {channel.subscriberCount && `(${channel.subscriberCount.toLocaleString()} subscribers)`}
                    </option>
                ))}
            </select>
            {selectedChannelId && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {channels.find(c => c.id === selectedChannelId)?.description}
                </div>
            )}
        </div>
    );
} 