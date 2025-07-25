'use client';

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Design system colors and variants
const buttonVariants = {
    // Primary actions
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl focus:ring-blue-500',

    // Secondary actions
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 focus:ring-gray-400',

    // Success actions (audio generation, play, etc.)
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500',

    // Warning actions (regenerate, modify)
    warning: 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl focus:ring-orange-500',

    // Danger actions (delete, remove)
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500',

    // Ghost/outline variants
    'primary-ghost': 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 focus:ring-blue-500',
    'secondary-ghost': 'bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 dark:text-gray-300 border border-gray-200 dark:border-slate-600 focus:ring-gray-400',
    'success-ghost': 'bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 focus:ring-green-500',
    'warning-ghost': 'bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 focus:ring-orange-500',
    'danger-ghost': 'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 focus:ring-red-500',

    // Link variant
    link: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline-offset-4 hover:underline focus:ring-blue-500'
};

const buttonSizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof buttonVariants;
    size?: keyof typeof buttonSizes;
    isLoading?: boolean;
    loadingText?: string;
    children: ReactNode;
    className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'primary',
        size = 'md',
        isLoading = false,
        loadingText,
        children,
        className,
        disabled,
        ...props
    }, ref) => {
        const isDisabled = disabled || isLoading;

        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={cn(
                    // Base styles
                    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transform hover:-translate-y-0.5 active:translate-y-0',

                    // Variant styles
                    buttonVariants[variant],

                    // Size styles
                    buttonSizes[size],

                    // Disabled state
                    isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none transform-none',

                    // Custom className
                    className
                )}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {isLoading ? (loadingText || children) : children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button; 