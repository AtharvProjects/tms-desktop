import React from 'react';
import { Button } from './button';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WhatsAppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon' | 'compact' | 'danger';
  isLoading?: boolean;
  label?: string;
  iconOnly?: boolean;
}

export const WhatsAppButton = React.forwardRef<HTMLButtonElement, WhatsAppButtonProps>(
  ({ 
    variant = 'primary', 
    isLoading = false, 
    label = 'WhatsApp', 
    iconOnly = false,
    className, 
    disabled, 
    children, 
    ...props 
  }, ref) => {
    
    if (variant === 'icon' || iconOnly) {
      return (
        <Button
          ref={ref}
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || isLoading}
          className={cn(
            "h-8 w-8 p-0 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/15 rounded-lg transition-colors",
            className
          )}
          {...props}
        >
          {isLoading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5" />
          )}
        </Button>
      );
    }

    if (variant === 'compact') {
      return (
        <Button
          ref={ref}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || isLoading}
          className={cn(
            "h-7 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg gap-1.5 transition-colors",
            className
          )}
          {...props}
        >
          {isLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
          <span>{children || label}</span>
        </Button>
      );
    }

    if (variant === 'secondary') {
      return (
        <Button
          ref={ref}
          type="button"
          variant="outline"
          disabled={disabled || isLoading}
          className={cn(
            "h-9 px-3.5 font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl gap-2 transition-colors",
            className
          )}
          {...props}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          <span>{children || label}</span>
        </Button>
      );
    }

    if (variant === 'danger') {
      return (
        <Button
          ref={ref}
          type="button"
          variant="destructive"
          disabled={disabled || isLoading}
          className={cn(
            "h-9 px-3.5 font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 shadow-sm transition-colors",
            className
          )}
          {...props}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          <span>{children || label}</span>
        </Button>
      );
    }

    // Default: 'primary'
    return (
      <Button
        ref={ref}
        type="button"
        disabled={disabled || isLoading}
        className={cn(
          "h-9 px-4 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 shadow-sm shadow-emerald-600/20 transition-all",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
        <span>{children || label}</span>
      </Button>
    );
  }
);

WhatsAppButton.displayName = 'WhatsAppButton';
