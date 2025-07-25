'use client';

import { cn } from '@/lib/utils';

interface InfoBadgeProps {
    icon: string;
    text: string;
    className?: string;
}

export default function InfoBadge({ icon, text, className }: InfoBadgeProps) {
    return (
        <div className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300',
            className
        )}>
            <span>{icon}</span>
            <span>{text}</span>
        </div>
    );
} 