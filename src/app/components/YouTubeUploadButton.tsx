'use client';

import { useState } from 'react';
import { VideoScript, YoutubeChannel } from '@/lib/db/schema';

interface YouTubeUploadButtonProps {
    script: VideoScript;
    channel: YoutubeChannel;
    onUploadSuccess?: (result: any) => void;
    className?: string;
}

export default function YouTubeUploadButton({
    script,
    channel,
    onUploadSuccess,
    className = ''
}: YouTubeUploadButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [uploadOptions, setUploadOptions] = useState({
        title: script.title,
        description: '',
        tags: 'education,tips,guide,howto,tutorial',
        privacyStatus: 'private' as 'private' | 'public' | 'unlisted'
    });

    const canUpload = script.videoUrl && channel.isAuthenticated;

    const handleUpload = async () => {
        if (!canUpload || loading) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/upload-to-youtube', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scriptId: script.id,
                    channelId: channel.id,
                    title: uploadOptions.title,
                    description: uploadOptions.description,
                    tags: uploadOptions.tags.split(',').map(tag => tag.trim()),
                    privacyStatus: uploadOptions.privacyStatus
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload video to YouTube');
            }

            setShowOptions(false);
            onUploadSuccess?.(data);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload video');
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
                    Upload to YouTube
                </button>
                <p className="mt-1 text-xs text-gray-500">
                    {reason}
                </p>
            </div>
        );
    }

    if (showOptions) {
        return (
            <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Upload to YouTube
                </h3>

                {error && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={uploadOptions.title}
                            onChange={(e) => setUploadOptions(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            maxLength={100}
                        />
                        <p className="text-xs text-gray-500 mt-1">{uploadOptions.title.length}/100</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={uploadOptions.description}
                            onChange={(e) => setUploadOptions(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Add a description for your video..."
                            maxLength={5000}
                        />
                        <p className="text-xs text-gray-500 mt-1">{uploadOptions.description.length}/5000</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tags (comma-separated)
                        </label>
                        <input
                            type="text"
                            value={uploadOptions.tags}
                            onChange={(e) => setUploadOptions(prev => ({ ...prev, tags: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="education, tips, guide, howto, tutorial"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Privacy Status
                        </label>
                        <select
                            value={uploadOptions.privacyStatus}
                            onChange={(e) => setUploadOptions(prev => ({ ...prev, privacyStatus: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="private">Private</option>
                            <option value="unlisted">Unlisted</option>
                            <option value="public">Public</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        onClick={() => setShowOptions(false)}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={loading || !uploadOptions.title.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Uploading...
                            </>
                        ) : (
                            'Upload to YouTube'
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            <button
                onClick={() => setShowOptions(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Upload to YouTube
            </button>
        </div>
    );
} 