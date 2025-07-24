'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation = () => {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Generate Ideas', icon: '💡' },
        { href: '/saved-ideas', label: 'Saved Ideas', icon: '📁' },
        { href: '/saved-scripts', label: 'Saved Scripts', icon: '🎬' }
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

                    <div className="flex space-x-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                                        ${isActive
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation; 