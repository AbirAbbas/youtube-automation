'use client';

import { useState } from 'react';
import Button from './ui/Button';

interface GenerateThumbnailButtonProps {
    scriptId: number;
    hasThumbnail: boolean;
    onThumbnailGenerated?: (thumbnailPath: string) => void;
    className?: string;
}

export default function GenerateThumbnailButton({
    scriptId,
    hasThumbnail,
    onThumbnailGenerated,
    className = ''
}: GenerateThumbnailButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateThumbnail = async () => {
        if (loading || hasThumbnail) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/generate-thumbnail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ scriptId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate thumbnail');
            }

            onThumbnailGenerated?.(data.thumbnailPath);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate thumbnail');
        } finally {
            setLoading(false);
        }
    };

    if (hasThumbnail) {
        return (
            <div className={`${className}`}>
                <Button
                    disabled
                    variant="secondary-ghost"
                    size="sm"
                    className="w-full justify-center"
                >
                    🖼️ Thumbnail Ready
                </Button>
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateThumbnail}
                disabled={loading}
                isLoading={loading}
                loadingText="Generating..."
                className="w-full justify-center"
            >
                🖼️ Generate Thumbnail
            </Button>
            {error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
} 