'use client';

import React, { useState, useEffect } from 'react';
import ArchivedVideosList from '@/app/components/ArchivedVideosList';
import ChannelSelector from '@/app/components/ChannelSelector';
import Button from '@/app/components/ui/Button';

export default function ArchivedVideosPage() {
    const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/channels');
            const data = await response.json();

            if (response.ok) {
                setChannels(data.channels || []);
                // Auto-select the first channel if available
                if (data.channels && data.channels.length > 0) {
                    setSelectedChannelId(data.channels[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading channels...</span>
                </div>
            </div>
        );
    }

    if (channels.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Archived Videos</h1>
                    <p className="text-gray-600 mb-6">No YouTube channels found.</p>
                    <Button variant="primary" onClick={() => window.location.href = '/channels'}>
                        Add YouTube Channel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">Archived Videos</h1>
                <p className="text-gray-600 mb-6">
                    Videos are automatically archived after successful YouTube upload to help manage storage and keep your workspace organized.
                </p>
                
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Channel
                    </label>
                    <ChannelSelector
                        channels={channels}
                        selectedChannelId={selectedChannelId}
                        onChannelSelect={setSelectedChannelId}
                    />
                </div>
            </div>

            {selectedChannelId ? (
                <ArchivedVideosList channelId={selectedChannelId} />
            ) : (
                <div className="text-center py-8">
                    <p className="text-gray-500">Please select a channel to view archived videos.</p>
                </div>
            )}
        </div>
    );
} 