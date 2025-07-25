'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

const statusConfig = {
    completed: {
        icon: '✅',
        label: 'Completed',
        className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
    },
    generating: {
        icon: '⏳',
        label: 'Generating',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
    },
    failed: {
        icon: '❌',
        label: 'Failed',
        className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
    },
    default: {
        icon: '📄',
        label: 'Unknown',
        className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800'
    }
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.default;

    return (
        <div className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
            config.className,
            className
        )}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </div>
    );
} 