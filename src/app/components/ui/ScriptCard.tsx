'use client';

import { useState } from 'react';
import { VideoScript, ScriptSection } from '@/lib/db/schema';
import Button from './Button';
import StatusBadge from './StatusBadge';
import InfoBadge from './InfoBadge';
import ConvertToAudioButton from '../ConvertToAudioButton';
import GenerateVideoButton from '../GenerateVideoButton';
import ScriptYouTubeUpload from '../ScriptYouTubeUpload';
import GenerateThumbnailButton from '../GenerateThumbnailButton';

interface ScriptWithSections extends VideoScript {
    sections?: ScriptSection[];
    topic?: string;
}

interface ScriptCardProps {
    script: ScriptWithSections;
    isExpanded: boolean;
    onToggleExpansion: () => void;
    onAudioGenerated: (audioUrl: string) => void;
    onVideoGenerated: (videoUrl: string) => void;
    onRegenerateScript: () => void;
    onDeleteScript: () => void;
    onArchiveScript?: () => void;
    onUnarchiveScript?: () => void;
    isRegenerating: boolean;
    isDeleting: boolean;
    isArchiving?: boolean;
    isUnarchiving?: boolean;
    onFetchSections: () => void;
}

export default function ScriptCard({
    script,
    isExpanded,
    onToggleExpansion,
    onAudioGenerated,
    onVideoGenerated,
    onRegenerateScript,
    onDeleteScript,
    onArchiveScript,
    onUnarchiveScript,
    isRegenerating,
    isDeleting,
    isArchiving = false,
    isUnarchiving = false,
    onFetchSections
}: ScriptCardProps) {
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

    const handleToggleExpansion = () => {
        if (!isExpanded && !script.sections) {
            onFetchSections();
        }
        onToggleExpansion();
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            {/* Header */}
            <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        {/* Status and Info Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <StatusBadge status={script.status} />
                            {script.estimatedLength && (
                                <InfoBadge icon="⏱️" text={script.estimatedLength} />
                            )}
                            <InfoBadge icon="📝" text={`${script.totalSections} sections`} />
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 leading-tight">
                            {script.title}
                        </h3>

                        {/* Date */}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Created {formatDate(script.createdAt)}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Audio Section */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Audio</p>
                        <ConvertToAudioButton
                            scriptId={script.id}
                            existingAudioUrl={script.audioUrl || undefined}
                            onAudioGenerated={onAudioGenerated}
                            disabled={false}
                        />
                    </div>

                    {/* Video Section */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Video</p>
                        <GenerateVideoButton
                            scriptId={script.id}
                            existingVideoUrl={script.videoUrl || undefined}
                            hasAudio={!!script.audioUrl}
                            onVideoGenerated={onVideoGenerated}
                            disabled={false}
                            videoTitle={script.title}
                            topic={script.topic}
                        />
                    </div>

                    {/* YouTube Upload Section */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">YouTube</p>
                        <div className="space-y-2">
                            <ScriptYouTubeUpload
                                script={script}
                                onUploadSuccess={(result) => {
                                    console.log('Video uploaded to YouTube:', result);
                                    // You could add a success message or refresh the script data here
                                }}
                            />
                            <GenerateThumbnailButton
                                scriptId={script.id}
                                hasThumbnail={!!script.thumbnailPath}
                                onThumbnailGenerated={(thumbnailPath) => {
                                    console.log('Thumbnail generated:', thumbnailPath);
                                    // You could add a success message or refresh the script data here
                                }}
                            />
                        </div>
                    </div>

                    {/* Script Actions */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Script</p>
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="primary-ghost"
                                size="sm"
                                onClick={handleToggleExpansion}
                                className="w-full justify-center"
                            >
                                {isExpanded ? '📖 Hide Script' : '👁️ View Script'}
                            </Button>
                            <Button
                                variant="warning-ghost"
                                size="sm"
                                onClick={onRegenerateScript}
                                disabled={isRegenerating}
                                isLoading={isRegenerating}
                                loadingText="Regenerating..."
                                className="w-full justify-center"
                            >
                                🔄 Regenerate
                            </Button>
                        </div>
                    </div>

                    {/* Management */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Manage</p>
                        <div className="flex flex-col gap-2">
                            {script.isArchived ? (
                                onUnarchiveScript && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={onUnarchiveScript}
                                        disabled={isUnarchiving || isDeleting || isRegenerating}
                                        isLoading={isUnarchiving}
                                        loadingText="Restoring..."
                                        className="w-full justify-center"
                                    >
                                        📂 Restore
                                    </Button>
                                )
                            ) : (
                                onArchiveScript && (
                                    <Button
                                        variant="secondary-ghost"
                                        size="sm"
                                        onClick={onArchiveScript}
                                        disabled={isArchiving || isDeleting || isRegenerating}
                                        isLoading={isArchiving}
                                        loadingText="Archiving..."
                                        className="w-full justify-center"
                                    >
                                        📦 Archive
                                    </Button>
                                )
                            )}
                            <Button
                                variant="danger-ghost"
                                size="sm"
                                onClick={onDeleteScript}
                                disabled={isDeleting || isRegenerating || isArchiving || isUnarchiving}
                                isLoading={isDeleting}
                                loadingText="Deleting..."
                                className="w-full justify-center"
                            >
                                🗑️ Delete
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/30">
                    <div className="p-6">
                        {script.sections ? (
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Script Sections
                                </h4>
                                <div className="space-y-3">
                                    {script.sections
                                        .sort((a, b) => a.orderIndex - b.orderIndex)
                                        .map((section, index) => (
                                            <div
                                                key={section.id}
                                                className="bg-white dark:bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500 shadow-sm"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h5 className="font-semibold text-gray-900 dark:text-white">
                                                        {index + 1}. {section.title}
                                                    </h5>
                                                    {section.estimatedDuration && (
                                                        <InfoBadge icon="⏱️" text={section.estimatedDuration} />
                                                    )}
                                                </div>
                                                <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                    {section.content}
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center items-center py-8">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Loading script sections...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 