'use client';
// Copy Content Component
// Button with copy functionality and micro animation

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '../../../shared/utils';

interface CopyContentProps {
  content: string | number;
  className?: string;
  disabled?: boolean;
}

export const CopyContent: React.FC<CopyContentProps> = ({
  content,
  className,
  disabled = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const textToCopy = String(content);

      // Prefer modern clipboard API when available and in a secure context.
      // Note: navigator.clipboard only works on HTTPS or localhost. For HTTP + IP
      // (e.g. http://172.24.0.109:3000), we fall back to a classic execCommand-based copy.
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for non-secure contexts / older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;

        // Avoid scrolling to bottom
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '1px';
        textArea.style.height = '1px';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error('Fallback copy command was unsuccessful');
        }
      }

      setCopied(true);
      toast.success('Copied to clipboard');
      
      // Reset the check icon after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      disabled={disabled}
      className={cn(
        'h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600 transition-all duration-200 relative',
        copied && 'text-green-600 hover:text-green-600',
        className
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label="Copy to clipboard"
    >
      <div className="relative w-4 h-4">
        <Copy 
          className={cn(
            'h-4 w-4 absolute inset-0 transition-all duration-200',
            copied ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
          )} 
        />
        <Check 
          className={cn(
            'h-4 w-4 absolute inset-0 transition-all duration-200 text-green-600',
            copied ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          )} 
        />
      </div>
    </Button>
  );
};

