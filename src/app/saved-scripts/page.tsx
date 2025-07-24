'use client';

import { useState, useEffect } from 'react';
import { VideoScript, ScriptSection } from '@/lib/db/schema';
import ConvertToAudioButton from '@/app/components/ConvertToAudioButton';
import GenerateVideoButton from '@/app/components/GenerateVideoButton';

interface SavedScriptsResponse {
    success: boolean;
    scripts?: VideoScript[];
    error?: string;
}

interface ScriptWithSections extends VideoScript {
    sections?: ScriptSection[];
}

const SavedScriptsPage = () => {
    const [scripts, setScripts] = useState<ScriptWithSections[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedScripts, setExpandedScripts] = useState<Set<number>>(new Set());
    const [regeneratingScripts, setRegeneratingScripts] = useState<Set<number>>(new Set());
    const [deletingScripts, setDeletingScripts] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchSavedScripts();
    }, []);

    const fetchSavedScripts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/get-scripts');
            const data: SavedScriptsResponse = await response.json();

            if (data.scripts) {
                setScripts(data.scripts);
            } else {
                setError(data.error || 'Failed to fetch scripts');
            }
        } catch (err) {
            setError('Failed to fetch saved scripts');
            console.error('Error fetching scripts:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchScriptSections = async (scriptId: number) => {
        try {
            const response = await fetch(`/api/get-scripts?scriptId=${scriptId}&includeSections=true`);
            const data = await response.json();

            if (data.script && data.sections) {
                setScripts(prevScripts =>
                    prevScripts.map(script =>
                        script.id === scriptId
                            ? { ...script, sections: data.sections }
                            : script
                    )
                );
            }
        } catch (error) {
            console.error('Error fetching script sections:', error);
        }
    };

    const handleAudioGenerated = (scriptId: number, audioUrl: string) => {
        setScripts(prevScripts =>
            prevScripts.map(script =>
                script.id === scriptId
                    ? { ...script, audioUrl }
                    : script
            )
        );
    };

    const handleVideoGenerated = (scriptId: number, videoUrl: string) => {
        setScripts(prevScripts =>
            prevScripts.map(script =>
                script.id === scriptId
                    ? { ...script, videoUrl }
                    : script
            )
        );
    };

    const handleRegenerateScript = async (script: VideoScript) => {
        if (!script.videoIdeaId) {
            alert('Cannot regenerate: This script is not associated with a video idea.');
            return;
        }

        const confirmed = window.confirm(`Are you sure you want to regenerate the script "${script.title}"? This will delete the existing script and create a new one. Any audio or video associated with this script will be lost.`);
        if (!confirmed) return;

        setRegeneratingScripts(prev => new Set(prev).add(script.id));

        try {
            const response = await fetch('/api/generate-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoIdeaId: script.videoIdeaId,
                    enableWebSearch: false, // Default to false, user can enable on ideas page
                    regenerate: true
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert('Script regenerated successfully! The page will refresh to show the new script.');
                // Refresh the scripts list
                await fetchSavedScripts();
            } else {
                throw new Error(data.error || 'Failed to regenerate script');
            }
        } catch (error) {
            console.error('Error regenerating script:', error);
            alert('Failed to regenerate script. Please try again.');
        } finally {
            setRegeneratingScripts(prev => {
                const newSet = new Set(prev);
                newSet.delete(script.id);
                return newSet;
            });
        }
    };

    const handleDeleteScript = async (script: VideoScript) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete the script "${script.title}"? This action cannot be undone and will also delete any associated audio or video files.`
        );

        if (!confirmed) return;

        setDeletingScripts(prev => new Set(prev).add(script.id));

        try {
            const response = await fetch(`/api/delete-script?scriptId=${script.id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                // Remove the script from the local state
                setScripts(prevScripts => prevScripts.filter(s => s.id !== script.id));
            } else {
                throw new Error(data.error || 'Failed to delete script');
            }
        } catch (error) {
            console.error('Error deleting script:', error);
            alert('Failed to delete script. Please try again.');
        } finally {
            setDeletingScripts(prev => {
                const newSet = new Set(prev);
                newSet.delete(script.id);
                return newSet;
            });
        }
    };

    const toggleScriptExpansion = (scriptId: number) => {
        setExpandedScripts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(scriptId)) {
                newSet.delete(scriptId);
            } else {
                newSet.add(scriptId);
                // Fetch sections if not already loaded
                const script = scripts.find(s => s.id === scriptId);
                if (script && !script.sections) {
                    fetchScriptSections(scriptId);
                }
            }
            return newSet;
        });
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'generating':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                            Error Loading Scripts
                        </h3>
                        <p className="text-red-600 dark:text-red-300">{error}</p>
                        <button
                            onClick={fetchSavedScripts}
                            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Saved Video Scripts
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        {scripts.length === 0
                            ? "No saved scripts yet. Generate some scripts from your ideas first!"
                            : `You have ${scripts.length} saved script${scripts.length !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>

                {scripts.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-8 max-w-md mx-auto">
                            <div className="text-6xl mb-4">🎬</div>
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                No Scripts Generated Yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Generate scripts from your saved ideas to see them here.
                            </p>
                            <a
                                href="/saved-ideas"
                                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                                View Saved Ideas
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {scripts.map((script) => (
                            <div
                                key={script.id}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(script.status)}`}>
                                                    📊 {script.status}
                                                </span>
                                                {script.estimatedLength && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                        ⏱️ {script.estimatedLength}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    📝 {script.totalSections} sections
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 leading-tight">
                                                {script.title}
                                            </h3>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <ConvertToAudioButton
                                                    scriptId={script.id}
                                                    existingAudioUrl={script.audioUrl}
                                                    onAudioGenerated={(audioUrl) => handleAudioGenerated(script.id, audioUrl)}
                                                    disabled={script.status !== 'completed'}
                                                />
                                                <button
                                                    onClick={() => toggleScriptExpansion(script.id)}
                                                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                                >
                                                    {expandedScripts.has(script.id) ? '📄 Hide Script' : '👁️ View Script'}
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <GenerateVideoButton
                                                    scriptId={script.id}
                                                    existingVideoUrl={script.videoUrl}
                                                    hasAudio={!!script.audioUrl}
                                                    onVideoGenerated={(videoUrl) => handleVideoGenerated(script.id, videoUrl)}
                                                    disabled={script.status !== 'completed'}
                                                />
                                                <button
                                                    onClick={() => handleRegenerateScript(script)}
                                                    disabled={regeneratingScripts.has(script.id) || script.status !== 'completed'}
                                                    className={`
                                                        px-3 py-1 rounded-lg font-medium transition-all duration-200 text-sm
                                                        ${regeneratingScripts.has(script.id) || script.status !== 'completed'
                                                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                                        }
                                                    `}
                                                >
                                                    {regeneratingScripts.has(script.id) ? (
                                                        <span className="flex items-center">
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                                            Regenerating...
                                                        </span>
                                                    ) : (
                                                        '🔄 Regenerate'
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteScript(script)}
                                                    disabled={deletingScripts.has(script.id) || regeneratingScripts.has(script.id)}
                                                    className={`
                                                        px-3 py-1 rounded-lg font-medium transition-all duration-200 text-sm
                                                        ${deletingScripts.has(script.id) || regeneratingScripts.has(script.id)
                                                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                            : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                                        }
                                                    `}
                                                >
                                                    {deletingScripts.has(script.id) ? (
                                                        <span className="flex items-center">
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                                            Deleting...
                                                        </span>
                                                    ) : (
                                                        '🗑️ Delete'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                                            Created: {formatDate(script.createdAt)}
                                        </span>
                                    </div>

                                    {expandedScripts.has(script.id) && (
                                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                                            {script.sections ? (
                                                <div className="space-y-4">
                                                    {script.sections
                                                        .sort((a, b) => a.orderIndex - b.orderIndex)
                                                        .map((section) => (
                                                            <div
                                                                key={section.id}
                                                                className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4"
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                                                        {section.title}
                                                                    </h4>
                                                                    {section.estimatedDuration && (
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-2 py-1 rounded">
                                                                            {section.estimatedDuration}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                                    {section.content}
                                                                </div>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            ) : (
                                                <div className="flex justify-center items-center py-8">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading script sections...</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {scripts.length > 0 && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={fetchSavedScripts}
                            className="inline-flex items-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                            🔄 Refresh Scripts
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SavedScriptsPage; 