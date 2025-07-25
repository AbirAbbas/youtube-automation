'use client';

import { useState } from 'react';

export default function UploadProcessorStatus() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');

    const startProcessor = async () => {
        try {
            setLoading(true);
            setStatus('');

            const response = await fetch('/api/start-upload-processor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start processor');
            }

            setStatus('✅ Upload processor started successfully');
        } catch (err) {
            setStatus(`❌ Error: ${err instanceof Error ? err.message : 'Failed to start processor'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                📺 YouTube Native Scheduling
            </h3>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Using YouTube's built-in scheduling system
                    </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Videos are uploaded immediately and scheduled on YouTube's servers
                </p>

                <div className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    ✅ No background processing required - YouTube handles scheduling
                </div>

                {status && (
                    <div className={`text-sm p-2 rounded ${status.startsWith('✅')
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
} 