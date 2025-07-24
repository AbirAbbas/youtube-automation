'use client';

import { useState } from 'react';

interface ConvertToAudioButtonProps {
    scriptId: string;
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
    const [useLocalTTS, setUseLocalTTS] = useState(true); // Default to local TTS
    const [voiceReference, setVoiceReference] = useState<string>('');

    const handleConvertToAudio = async () => {
        try {
            setIsConverting(true);
            setError(null);

            const endpoint = useLocalTTS ? '/api/convert-to-audio-local' : '/api/convert-to-audio';
            const requestBody = useLocalTTS
                ? { scriptId, voiceReference: voiceReference || undefined }
                : { scriptId };

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
            setVoiceReference(tempUrl);

            // Note: In a real implementation, you'd want to upload this file
            // and get a permanent URL, but for demo purposes this works
        }
    };

    return (
        <div className="space-y-4">
            {/* TTS Provider Selection */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        TTS Provider
                    </span>
                    <div className="flex items-center space-x-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="tts-provider"
                                checked={!useLocalTTS}
                                onChange={() => setUseLocalTTS(false)}
                                className="text-blue-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                ElevenLabs (Cloud)
                            </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="tts-provider"
                                checked={useLocalTTS}
                                onChange={() => setUseLocalTTS(true)}
                                className="text-green-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Coqui TTS (Local)
                            </span>
                        </label>
                    </div>
                </div>

                {/* Voice Reference Upload for Local TTS */}
                {useLocalTTS && (
                    <div className="space-y-2">
                        <label className="block text-xs text-gray-600 dark:text-gray-400">
                            Voice Reference (Optional - Upload 6+ seconds of clear speech):
                        </label>
                        <input
                            type="file"
                            accept="audio/*"
                            onChange={handleVoiceUpload}
                            className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {voiceReference && (
                            <p className="text-xs text-green-600">
                                ✓ Voice reference uploaded
                            </p>
                        )}
                    </div>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {useLocalTTS ? (
                        <>
                            🚀 <strong>Local TTS:</strong> Free, private, runs on your RTX 4090.
                            Upload voice sample for cloning or use default voice.
                        </>
                    ) : (
                        <>
                            ☁️ <strong>ElevenLabs:</strong> High quality cloud TTS.
                            Requires API key and credits.
                        </>
                    )}
                </div>
            </div>

            {/* Existing Audio Controls */}
            {existingAudioUrl && (
                <button
                    onClick={playAudio}
                    className="inline-flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                    🎵 Play Audio
                </button>
            )}

            {/* Convert Button */}
            <button
                onClick={handleConvertToAudio}
                disabled={disabled || isConverting}
                className={`inline-flex items-center px-4 py-2 rounded-lg hover:opacity-80 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium ${useLocalTTS
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
                title={useLocalTTS
                    ? "Convert script to audio using local Coqui TTS on your RTX 4090"
                    : "Convert script to audio with consistent levels using ElevenLabs"
                }
            >
                {isConverting ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {useLocalTTS ? 'Generating locally...' : 'Processing sections...'}
                    </>
                ) : (
                    <>
                        {useLocalTTS ? (
                            <>🚀 Convert with Local TTS</>
                        ) : (
                            <>🎤 Convert to Audio (ElevenLabs)</>
                        )}
                    </>
                )}
            </button>

            {/* Error Display */}
            {error && (
                <div className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                    {error}
                </div>
            )}

            {/* Info Message */}
            {!isConverting && !existingAudioUrl && (
                <div className={`text-xs rounded-lg p-2 border ${useLocalTTS
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}>
                    {useLocalTTS ? (
                        <>✨ <strong>Free & Private:</strong> Uses your RTX 4090 for high-quality voice synthesis</>
                    ) : (
                        <>✨ <strong>Enhanced:</strong> Sections processed individually for consistent audio levels</>
                    )}
                </div>
            )}
        </div>
    );
} 