'use client';

import { useState, useEffect } from 'react';
import { VideoScript, YoutubeChannel } from '@/lib/db/schema';
import AutomatedYouTubeUploadButton from './AutomatedYouTubeUploadButton';

interface ScriptYouTubeUploadProps {
    script: VideoScript;
    onUploadSuccess?: (result: any) => void;
}

export default function ScriptYouTubeUpload({
    script,
    onUploadSuccess
}: ScriptYouTubeUploadProps) {
    const [channel, setChannel] = useState<YoutubeChannel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchScriptChannel();
    }, [script.id]);

    const fetchScriptChannel = async () => {
        try {
            setLoading(true);
            setError('');

            // First get the video idea to find the channel ID
            const ideaResponse = await fetch(`/api/get-ideas/${script.videoIdeaId}`);
            const ideaData = await ideaResponse.json();

            if (!ideaResponse.ok || !ideaData.success) {
                throw new Error('Failed to fetch video idea');
            }

            const videoIdea = ideaData.idea;
            if (!videoIdea.channelId) {
                throw new Error('Video idea has no associated channel');
            }

            // Then get the channel details
            const channelResponse = await fetch(`/api/channels/${videoIdea.channelId}`);
            const channelData = await channelResponse.json();

            if (!channelResponse.ok || !channelData.success) {
                throw new Error('Failed to fetch channel details');
            }

            setChannel(channelData.channel);
        } catch (err) {
            console.error('Error fetching script channel:', err);
            setError(err instanceof Error ? err.message : 'Failed to load channel');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md bg-red-50 dark:bg-red-900/20 text-center">
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">No channel found</span>
            </div>
        );
    }

    return (
        <AutomatedYouTubeUploadButton
            script={script}
            channel={channel}
            onUploadSuccess={onUploadSuccess}
        />
    );
} 