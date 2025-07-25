'use client';

import { useState } from 'react';
import Button from './ui/Button';

interface ConvertToAudioButtonProps {
    scriptId: number;
    existingAudioUrl?: string;
    onAudioGenerated?: (audioUrl: string) => void;
    disabled?: boolean;
}

export default function ConvertToAudioButton({
    scriptId,
    existingAudioUrl,
    onAudioGenerated,
    disabled = false
}: ConvertToAudioButtonProps) {
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Remove useLocalTTS and voiceReference toggling

    const handleConvertToAudio = async () => {
        try {
            setIsConverting(true);
            setError(null);

            // Always use local TTS endpoint
            const endpoint = '/api/convert-to-audio-local';
            const requestBody = { scriptId };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to convert script to audio');
            }

            if (data.success && data.audioUrl) {
                onAudioGenerated?.(data.audioUrl);
            }

        } catch (err) {
            console.error('Error converting to audio:', err);
            setError(err instanceof Error ? err.message : 'Failed to convert to audio');
        } finally {
            setIsConverting(false);
        }
    };

    const playAudio = () => {
        if (existingAudioUrl) {
            window.open(existingAudioUrl, '_blank');
        }
    };

    const handleVoiceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Create a temporary URL for the voice reference
            const tempUrl = URL.createObjectURL(file);
            // setVoiceReference(tempUrl); // This state variable is removed

            // Note: In a real implementation, you'd want to upload this file
            // and get a permanent URL, but for demo purposes this works
        }
    };

    return (
        <div className="space-y-3">
            {/* TTS Provider Selection */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3">
                {/* Remove radio buttons for TTS provider selection */}
                {/* Remove ElevenLabs info and only show Kokoro TTS info */}
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    🚀 <strong className="text-green-700 dark:text-green-400">Kokoro TTS:</strong> Free, private, ultra-fast 82M parameter model.
                    Upload voice sample for cloning or use default voice.
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
                {/* Existing Audio Controls */}
                {existingAudioUrl && (
                    <Button
                        variant="success-ghost"
                        size="sm"
                        onClick={playAudio}
                        className="w-full"
                    >
                        🎵 Play Audio
                    </Button>
                )}

                {/* Only show Convert with Local TTS button */}
                <Button
                    variant='success'
                    size="sm"
                    onClick={handleConvertToAudio}
                    disabled={disabled || isConverting}
                    isLoading={isConverting}
                    loadingText={'Generating locally...'}
                    className="w-full"
                >
                    <>�� Convert with Local TTS</>
                </Button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <div className="text-red-500 text-sm">⚠️</div>
                        <div className="text-red-700 dark:text-red-300 text-sm">
                            <div className="font-medium">Audio generation failed</div>
                            <div className="text-xs mt-1">{error}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Message */}
            {!isConverting && !existingAudioUrl && (
                <div className={`text-xs rounded-lg p-2 border text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`}>
                    ✨ <strong>Free & Private:</strong> Uses your RTX 4090 for high-quality voice synthesis
                </div>
            )}
        </div>
    );
} 