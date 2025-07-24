'use client';

import { useState, useEffect } from 'react';
import { VideoIdea } from '@/lib/db/schema';

interface SavedIdeasResponse {
    success: boolean;
    ideas: VideoIdea[];
    error?: string;
}

const SavedIdeasPage = () => {
    const [ideas, setIdeas] = useState<VideoIdea[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [generatingScripts, setGeneratingScripts] = useState<Set<number>>(new Set());
    const [enableWebSearch, setEnableWebSearch] = useState<{ [key: number]: boolean }>({});
    const [deletingIdeas, setDeletingIdeas] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchSavedIdeas();
    }, []);

    const fetchSavedIdeas = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/get-ideas');
            const data: SavedIdeasResponse = await response.json();

            if (data.success) {
                setIdeas(data.ideas);
            } else {
                setError(data.error || 'Failed to fetch ideas');
            }
        } catch (err) {
            setError('Failed to fetch saved ideas');
            console.error('Error fetching ideas:', err);
        } finally {
            setLoading(false);
        }
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

    const handleGenerateScript = async (idea: VideoIdea) => {
        setGeneratingScripts(prev => new Set(prev).add(idea.id));

        try {
            const response = await fetch('/api/generate-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoIdeaId: idea.id,
                    enableWebSearch: enableWebSearch[idea.id] || false
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Remove the idea from the local state since it will be converted to script
                setIdeas(prevIdeas => prevIdeas.filter(i => i.id !== idea.id));

                // Show success message
                alert(`Script generated successfully${enableWebSearch[idea.id] ? ' with current web information' : ''}! Check your Saved Scripts page.`);
            } else {
                throw new Error(data.error || 'Failed to generate script');
            }
        } catch (error) {
            console.error('Error generating script:', error);
            alert('Failed to generate script. Please try again.');
        } finally {
            setGeneratingScripts(prev => {
                const newSet = new Set(prev);
                newSet.delete(idea.id);
                return newSet;
            });
        }
    };

    const toggleWebSearch = (ideaId: number) => {
        setEnableWebSearch(prev => ({
            ...prev,
            [ideaId]: !prev[ideaId]
        }));
    };

    const handleDeleteIdea = async (idea: VideoIdea) => {
        const confirmed = window.confirm(`Are you sure you want to delete "${idea.title}"? This action cannot be undone.`);
        if (!confirmed) return;

        setDeletingIdeas(prev => new Set(prev).add(idea.id));

        try {
            const response = await fetch(`/api/delete-idea?id=${idea.id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                // Remove the idea from the local state
                setIdeas(prevIdeas => prevIdeas.filter(i => i.id !== idea.id));
                alert('Idea deleted successfully!');
            } else {
                throw new Error(data.error || 'Failed to delete idea');
            }
        } catch (error) {
            console.error('Error deleting idea:', error);
            alert('Failed to delete idea. Please try again.');
        } finally {
            setDeletingIdeas(prev => {
                const newSet = new Set(prev);
                newSet.delete(idea.id);
                return newSet;
            });
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
                            Error Loading Ideas
                        </h3>
                        <p className="text-red-600 dark:text-red-300">{error}</p>
                        <button
                            onClick={fetchSavedIdeas}
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
                        Saved Video Ideas
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        {ideas.length === 0
                            ? "No saved ideas yet. Generate some ideas first!"
                            : `You have ${ideas.length} saved idea${ideas.length !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>

                {ideas.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-8 max-w-md mx-auto">
                            <div className="text-6xl mb-4">💡</div>
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                No Ideas Saved Yet
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Start by generating some video ideas to see them here.
                            </p>
                            <a
                                href="/"
                                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                                Generate Ideas
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {ideas.map((idea) => (
                            <div
                                key={idea.id}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="mb-4">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {idea.topic && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                    📝 {idea.topic}
                                                </span>
                                            )}
                                            {idea.category && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    🏷️ {idea.category}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 leading-tight">
                                            {idea.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {idea.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between text-sm mb-4">
                                        {idea.estimatedLength && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                ⏱️ {idea.estimatedLength}
                                            </span>
                                        )}

                                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                                            {formatDate(idea.createdAt)}
                                        </span>
                                    </div>

                                    {/* Web Search Toggle */}
                                    <div className="mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-3">
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id={`webSearch-${idea.id}`}
                                                checked={enableWebSearch[idea.id] || false}
                                                onChange={() => toggleWebSearch(idea.id)}
                                                disabled={generatingScripts.has(idea.id)}
                                                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                                            />
                                            <label htmlFor={`webSearch-${idea.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
                                                <span className="mr-2">🌐</span>
                                                Include Current Web Information
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-7">
                                            When enabled, the script will include up-to-date facts, recent news, and current information about the topic.
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteIdea(idea)}
                                            disabled={deletingIdeas.has(idea.id) || generatingScripts.has(idea.id)}
                                            className={`
                                                w-full px-4 py-2 rounded-lg font-medium transition-all duration-200
                                                ${deletingIdeas.has(idea.id) || generatingScripts.has(idea.id)
                                                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                                }
                                            `}
                                        >
                                            {deletingIdeas.has(idea.id) ? (
                                                <span className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                                    Deleting...
                                                </span>
                                            ) : (
                                                '🗑️ Delete Idea'
                                            )}
                                        </button>

                                        {/* Generate Script Button */}
                                        <button
                                            onClick={() => handleGenerateScript(idea)}
                                            disabled={generatingScripts.has(idea.id) || deletingIdeas.has(idea.id)}
                                            className={`
                                                w-full px-4 py-2 rounded-lg font-medium transition-all duration-200
                                                ${generatingScripts.has(idea.id) || deletingIdeas.has(idea.id)
                                                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                                }
                                            `}
                                        >
                                            {generatingScripts.has(idea.id) ? (
                                                <span className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                                    {enableWebSearch[idea.id] ? 'Generating Script with Web Search...' : 'Generating Script...'}
                                                </span>
                                            ) : (
                                                <>
                                                    🎬 Generate Script
                                                    {enableWebSearch[idea.id] && <span className="ml-2 text-xs">+ Web Search</span>}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {ideas.length > 0 && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={fetchSavedIdeas}
                            className="inline-flex items-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                        >
                            🔄 Refresh Ideas
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SavedIdeasPage; 