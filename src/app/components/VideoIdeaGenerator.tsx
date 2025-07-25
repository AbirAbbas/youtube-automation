'use client';

import { useState, useEffect } from 'react';
import ChannelSelector from './ChannelSelector';
import CreateChannelModal from './CreateChannelModal';
import { YoutubeChannel } from '@/lib/db/schema';

interface VideoIdea {
    title: string;
    description: string;
    estimatedLength: string;
}

interface GeneratorResponse {
    ideas: VideoIdea[];
    error?: string;
}

const VideoIdeaGenerator = () => {
    const [topic, setTopic] = useState('');
    const [category, setCategory] = useState('');
    const [count, setCount] = useState(5);
    const [ideas, setIdeas] = useState<VideoIdea[]>([]);
    const [loading, setLoading] = useState(false);
    const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [enableWebSearch, setEnableWebSearch] = useState(false);
    const [aiAutomatable, setAiAutomatable] = useState(true);
    const [videoType, setVideoType] = useState<'full-length' | 'shorts'>('full-length');
    const [selectedChannelId, setSelectedChannelId] = useState<number | undefined>();
    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
    // Add state for loading channel preferences
    const [loadingChannelPrefs, setLoadingChannelPrefs] = useState(false);

    const topics = [
        'Sleep',
        'Fictional Stories',
        'Crime Stories',
        'Technology',
        'Programming',
        'Health',
        'Music',
        'Comedy',
        'Business',
        'Science',
        'Sports',
        'Movies',
        'Photography',
        'Homes',
        'Pets',
        'Cars',
        'Personal Development',
        'History',
        'Productivity',
        'Mental Health',
        'Wellness',
        'Self-Improvement',
        'Personal Growth',
        'Personal Finance',
    ];

    // Replace the old categories array with video type categories
    const categories = [
        'How-to',
        'Essay',
        'Explainer',
        'Storytime',
        'Comparison',
        'Q&A',
        'News',
        'Analysis',
        'Top 10',
        'Tips & Tricks',
        'Motivational',
        'Educational',
        'Fiction',
        'Scientific Explanation',
        'Thought leadership',
        'Interesting Facts',
        'Deep Dive',
    ];

    // Fetch and set topic/category when channel changes
    useEffect(() => {
        if (!selectedChannelId) return;
        setLoadingChannelPrefs(true);
        fetch(`/api/channels/${selectedChannelId}/preferences`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setTopic(data.topic || '');
                    setCategory(data.category || '');
                }
            })
            .finally(() => setLoadingChannelPrefs(false));
    }, [selectedChannelId]);

    // Save topic/category when changed
    useEffect(() => {
        if (!selectedChannelId) return;
        if (!topic && !category) return;
        fetch(`/api/channels/${selectedChannelId}/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, category })
        });
    }, [topic, category, selectedChannelId]);

    const generateIdeas = async () => {
        if (!topic.trim()) {
            setError('Please select a topic');
            return;
        }

        setLoading(true);
        setError('');
        setIdeas([]);

        try {
            const response = await fetch('/api/generate-ideas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: topic.trim(),
                    category: category || undefined,
                    count,
                    enableWebSearch,
                    aiAutomatable,
                    videoType,
                }),
            });

            const data: GeneratorResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate ideas');
            }

            setIdeas(data.ideas);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const regenerateIdea = async (index: number) => {
        if (!topic.trim()) return;

        setRegeneratingIndex(index);
        setError('');

        try {
            const response = await fetch('/api/generate-ideas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: topic.trim(),
                    category: category || undefined,
                    count: 1, // Generate only 1 new idea
                    enableWebSearch,
                    aiAutomatable,
                    videoType,
                }),
            });

            const data: GeneratorResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to regenerate idea');
            }

            if (data.ideas && data.ideas.length > 0) {
                // Replace the specific idea at the given index
                setIdeas(prevIdeas => {
                    const newIdeas = [...prevIdeas];
                    newIdeas[index] = data.ideas[0];
                    return newIdeas;
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to regenerate idea');
        } finally {
            setRegeneratingIndex(null);
        }
    };

    const saveAllIdeas = async () => {
        if (!ideas || ideas.length === 0) {
            setSaveMessage('No ideas to save');
            return;
        }

        if (!selectedChannelId) {
            setSaveMessage('❌ Please select a YouTube channel first');
            return;
        }

        setSaving(true);
        setSaveMessage('');

        try {
            const response = await fetch('/api/save-ideas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ideas,
                    topic: topic.trim(),
                    category: category.trim(),
                    channelId: selectedChannelId
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save ideas');
            }

            setSaveMessage(`✅ ${data.message}`);
        } catch (err) {
            setSaveMessage(`❌ ${err instanceof Error ? err.message : 'Failed to save ideas'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleChannelCreated = (channel: YoutubeChannel) => {
        setSelectedChannelId(channel.id);
        setSaveMessage(`✅ Channel "${channel.name}" created successfully!`);
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-2xl p-8 mb-8 border border-gray-100 dark:border-slate-700">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    YouTube Video Idea Generator
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    Generate creative YouTube video ideas using AI. Select a topic and get engaging content suggestions!
                </p>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2">
                            <ChannelSelector
                                selectedChannelId={selectedChannelId}
                                onChannelSelect={setSelectedChannelId}
                                required={true}
                            />
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    console.log('Create Channel button clicked');
                                    setShowCreateChannelModal(true);
                                }}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                Create Channel
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Topic *
                        </label>
                        <select
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            disabled={loadingChannelPrefs}
                        >
                            <option value="">Select a topic...</option>
                            {topics.map((topicOption) => (
                                <option key={topicOption} value={topicOption}>
                                    {topicOption}
                                </option>
                            ))}
                        </select>
                        {/* Move help text below select */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <strong>Topic</strong> is what your channel or video is all about (e.g., "Technology & Programming", "Fitness & Health").
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                Category (Video Type)
                            </label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                disabled={loadingChannelPrefs}
                            >
                                <option value="">Select a video type...</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            {/* Move help text below select */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <strong>Category</strong> is the type or style of video (e.g., How-to, Essay, Review, Challenge, etc.).
                            </p>
                        </div>

                        <div>
                            <label htmlFor="count" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                Number of Ideas
                            </label>
                            <select
                                id="count"
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                                <option value={3}>3 ideas</option>
                                <option value={5}>5 ideas</option>
                                <option value={8}>8 ideas</option>
                                <option value={10}>10 ideas</option>
                            </select>
                        </div>
                    </div>

                    {/* Video Type Toggle */}
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-4">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
                                <span className="mr-2">🎬</span>
                                Video Type:
                            </span>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="videoType"
                                        value="full-length"
                                        checked={videoType === 'full-length'}
                                        onChange={(e) => setVideoType(e.target.value as 'full-length' | 'shorts')}
                                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">Full-Length Videos (8+ min)</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="videoType"
                                        value="shorts"
                                        checked={videoType === 'shorts'}
                                        onChange={(e) => setVideoType(e.target.value as 'full-length' | 'shorts')}
                                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">YouTube Shorts (15-60 sec)</span>
                                </label>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-7">
                            Choose between full-length video ideas or quick YouTube Shorts content.
                        </p>
                    </div>

                    {/* AI Automation Filter */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="aiAutomatable"
                                checked={aiAutomatable}
                                onChange={(e) => setAiAutomatable(e.target.checked)}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="aiAutomatable" className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
                                <span className="mr-2">🤖</span>
                                Only AI-Automatable Ideas
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-7">
                            Generate only ideas that can go through the full AI creation pipeline (script → audio → video with stock footage).
                        </p>
                    </div>

                    {/* Web Search Toggle */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="webSearch"
                                checked={enableWebSearch}
                                onChange={(e) => setEnableWebSearch(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="webSearch" className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
                                <span className="mr-2">🌐</span>
                                Search web for trending news & topics
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-7">
                            When enabled, AI will consider current trending topics from Google and YouTube when generating ideas.
                        </p>
                    </div>

                    <button
                        onClick={generateIdeas}
                        disabled={loading || !topic.trim()}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Generating Ideas...
                            </div>
                        ) : (
                            'Generate Video Ideas ✨'
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                    </div>
                )}
            </div>

            {ideas.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Generated {videoType === 'shorts' ? 'YouTube Shorts' : 'Video'} Ideas 🎬
                        </h2>
                        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center">
                                <span className="mr-1">{videoType === 'shorts' ? '📱' : '🎬'}</span>
                                {videoType === 'shorts' ? 'Shorts (15-60s)' : 'Full-Length (8+ min)'}
                            </span>
                            {aiAutomatable && (
                                <span className="flex items-center bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                                    <span className="mr-1">🤖</span>
                                    AI-Automatable
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6">
                        {ideas.map((idea, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-2xl p-6 border-l-4 border-blue-500 dark:border-blue-400 hover:shadow-lg dark:hover:shadow-3xl transition-shadow duration-200 border border-gray-100 dark:border-slate-700"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex-1">
                                        {idea.title}
                                    </h3>
                                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                                            {idea.estimatedLength}
                                        </span>
                                        <button
                                            onClick={() => regenerateIdea(index)}
                                            disabled={regeneratingIndex === index || !topic.trim()}
                                            className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Regenerate this idea"
                                        >
                                            {regeneratingIndex === index ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 dark:border-gray-300"></div>
                                            ) : (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {idea.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Save All Ideas Button */}
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <button
                            onClick={saveAllIdeas}
                            disabled={saving || ideas.length === 0}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500 text-white font-semibold py-3 px-8 rounded-lg hover:from-green-700 hover:to-emerald-700 dark:hover:from-green-600 dark:hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            {saving ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Saving Ideas...
                                </div>
                            ) : (
                                '💾 Save All Ideas to Database'
                            )}
                        </button>

                        {saveMessage && (
                            <div className={`p-3 rounded-lg text-sm font-medium ${saveMessage.startsWith('✅')
                                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                }`}>
                                {saveMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <CreateChannelModal
                isOpen={showCreateChannelModal}
                onClose={() => setShowCreateChannelModal(false)}
                onChannelCreated={handleChannelCreated}
            />
        </div>
    );
};

export default VideoIdeaGenerator; 