'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ChannelSelector from './ChannelSelector';
import { createContext, useContext, useEffect, useState } from 'react';

export const ChannelContext = createContext<{
    selectedChannelId?: number;
    setSelectedChannelId: (id: number) => void;
}>({ selectedChannelId: undefined, setSelectedChannelId: () => { } });

export function ChannelProvider({ children }: { children: React.ReactNode }) {
    const [selectedChannelId, setSelectedChannelId] = useState<number | undefined>(undefined);

    useEffect(() => {
        const stored = localStorage.getItem('selectedChannelId');
        if (stored) setSelectedChannelId(Number(stored));
    }, []);

    useEffect(() => {
        if (selectedChannelId) {
            localStorage.setItem('selectedChannelId', String(selectedChannelId));
        }
    }, [selectedChannelId]);

    return (
        <ChannelContext.Provider value={{ selectedChannelId, setSelectedChannelId }}>
            {children}
        </ChannelContext.Provider>
    );
}

const Navigation = () => {
    const pathname = usePathname();
    const { selectedChannelId, setSelectedChannelId } = useContext(ChannelContext);

    const navItems = [
        { href: '/', label: 'Generate Ideas', icon: '💡' },
        { href: '/saved-ideas', label: 'Saved Ideas', icon: '📁' },
        { href: '/saved-scripts', label: 'Saved Scripts', icon: '🎬' },
        { href: '/channels', label: 'Channels', icon: '📺' },
        { href: '/archived-videos', label: 'Archived Videos', icon: '📦' }
    ];

    return (
        <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            YouTube Idea Generator
                        </h1>
                    </div>

                    <div className="flex items-center space-x-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                        <div className="ml-4 min-w-[180px] flex items-center">
                            <ChannelSelector
                                selectedChannelId={selectedChannelId}
                                onChannelSelect={setSelectedChannelId}
                                required={true}
                                className="!mb-0 !mt-0"
                                renderInline
                            />
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation; 