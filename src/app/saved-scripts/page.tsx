'use client';

import { useState, useEffect } from 'react';
import { VideoScript, ScriptSection } from '@/lib/db/schema';
import Button from '@/app/components/ui/Button';
import ScriptCard from '@/app/components/ui/ScriptCard';

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
    const [archivedScripts, setArchivedScripts] = useState<ScriptWithSections[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedScripts, setExpandedScripts] = useState<Set<number>>(new Set());
    const [regeneratingScripts, setRegeneratingScripts] = useState<Set<number>>(new Set());
    const [deletingScripts, setDeletingScripts] = useState<Set<number>>(new Set());
    const [archivingScripts, setArchivingScripts] = useState<Set<number>>(new Set());
    const [unarchivingScripts, setUnarchivingScripts] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchSavedScripts();
        fetchArchivedScripts();
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

    const fetchArchivedScripts = async () => {
        try {
            const response = await fetch('/api/get-scripts?archived=true');
            const data: SavedScriptsResponse = await response.json();

            if (data.scripts) {
                setArchivedScripts(data.scripts);
            } else {
                console.error('Failed to fetch archived scripts:', data.error);
            }
        } catch (err) {
            console.error('Error fetching archived scripts:', err);
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
                    enableWebSearch: false
                }),
            });

            const data = await response.json();

            if (data.success) {
                await fetchSavedScripts();
                alert('Script regenerated successfully!');
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

    const handleArchiveScript = async (script: VideoScript) => {
        const confirmed = window.confirm(
            `Are you sure you want to archive the script "${script.title}"? You can restore it from the archived section later.`
        );

        if (!confirmed) return;

        setArchivingScripts(prev => new Set(prev).add(script.id));

        try {
            const response = await fetch('/api/archive-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scriptId: script.id,
                    action: 'archive'
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Move script from active to archived
                setScripts(prevScripts => prevScripts.filter(s => s.id !== script.id));
                setArchivedScripts(prevArchived => [...prevArchived, { ...script, isArchived: true }]);
            } else {
                throw new Error(data.error || 'Failed to archive script');
            }
        } catch (error) {
            console.error('Error archiving script:', error);
            alert('Failed to archive script. Please try again.');
        } finally {
            setArchivingScripts(prev => {
                const newSet = new Set(prev);
                newSet.delete(script.id);
                return newSet;
            });
        }
    };

    const handleUnarchiveScript = async (script: VideoScript) => {
        setUnarchivingScripts(prev => new Set(prev).add(script.id));

        try {
            const response = await fetch('/api/archive-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scriptId: script.id,
                    action: 'unarchive'
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Move script from archived to active
                setArchivedScripts(prevArchived => prevArchived.filter(s => s.id !== script.id));
                setScripts(prevScripts => [...prevScripts, { ...script, isArchived: false }]);
            } else {
                throw new Error(data.error || 'Failed to unarchive script');
            }
        } catch (error) {
            console.error('Error unarchiving script:', error);
            alert('Failed to restore script. Please try again.');
        } finally {
            setUnarchivingScripts(prev => {
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
            }
            return newSet;
        });
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                Loading Scripts
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Fetching your saved video scripts...
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="max-w-md w-full">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center border border-red-200 dark:border-red-800">
                                <div className="text-6xl mb-4">⚠️</div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Error Loading Scripts
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    {error}
                                </p>
                                <Button
                                    variant="primary"
                                    onClick={fetchSavedScripts}
                                    className="w-full"
                                >
                                    🔄 Try Again
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    const currentScripts = activeTab === 'active' ? scripts : archivedScripts;

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                        📚 Saved Video Scripts
                    </h1>

                    {/* Tabs */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-1 shadow-md border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'active'
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'
                                    }`}
                            >
                                Active Scripts ({scripts.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'archived'
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'
                                    }`}
                            >
                                Archived ({archivedScripts.length})
                            </button>
                        </div>
                    </div>

                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {activeTab === 'active'
                            ? (scripts.length === 0
                                ? "Ready to create amazing content? Generate some scripts from your ideas first!"
                                : `Manage and create content from your ${scripts.length} saved script${scripts.length !== 1 ? 's' : ''}`
                            )
                            : (archivedScripts.length === 0
                                ? "No archived scripts yet. Archive scripts you want to keep but aren't actively using."
                                : `You have ${archivedScripts.length} archived script${archivedScripts.length !== 1 ? 's' : ''}`
                            )
                        }
                    </p>
                </div>

                {/* Empty State */}
                {currentScripts.length === 0 ? (
                    <div className="flex justify-center">
                        <div className="max-w-lg w-full">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-12 text-center border border-gray-200 dark:border-gray-700">
                                <div className="text-8xl mb-6">{activeTab === 'active' ? '🎬' : '📦'}</div>
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                    {activeTab === 'active' ? 'No Scripts Generated Yet' : 'No Archived Scripts'}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                    {activeTab === 'active'
                                        ? 'Transform your creative ideas into engaging video scripts. Head over to your saved ideas and start generating!'
                                        : 'Archive scripts you want to keep but aren\'t actively using. They\'ll appear here where you can view details and restore them anytime.'
                                    }
                                </p>
                                {activeTab === 'active' && (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => window.location.href = '/saved-ideas'}
                                        className="w-full"
                                    >
                                        💡 Browse Saved Ideas
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Scripts Grid */}
                        <div className="space-y-6 mb-12">
                            {currentScripts.map((script) => (
                                <ScriptCard
                                    key={script.id}
                                    script={script}
                                    isExpanded={expandedScripts.has(script.id)}
                                    onToggleExpansion={() => toggleScriptExpansion(script.id)}
                                    onAudioGenerated={(audioUrl) => handleAudioGenerated(script.id, audioUrl)}
                                    onVideoGenerated={(videoUrl) => handleVideoGenerated(script.id, videoUrl)}
                                    onRegenerateScript={() => handleRegenerateScript(script)}
                                    onDeleteScript={() => handleDeleteScript(script)}
                                    onArchiveScript={activeTab === 'active' ? () => handleArchiveScript(script) : undefined}
                                    onUnarchiveScript={activeTab === 'archived' ? () => handleUnarchiveScript(script) : undefined}
                                    isRegenerating={regeneratingScripts.has(script.id)}
                                    isDeleting={deletingScripts.has(script.id)}
                                    isArchiving={archivingScripts.has(script.id)}
                                    isUnarchiving={unarchivingScripts.has(script.id)}
                                    onFetchSections={() => fetchScriptSections(script.id)}
                                />
                            ))}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => {
                                    fetchSavedScripts();
                                    fetchArchivedScripts();
                                }}
                                className="min-w-[200px]"
                            >
                                🔄 Refresh Scripts
                            </Button>
                            <Button
                                variant="primary-ghost"
                                size="lg"
                                onClick={() => window.location.href = '/saved-ideas'}
                                className="min-w-[200px]"
                            >
                                💡 Generate More Scripts
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

export default SavedScriptsPage; 