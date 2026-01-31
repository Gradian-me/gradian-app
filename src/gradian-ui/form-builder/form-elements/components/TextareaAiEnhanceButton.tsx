'use client';

import React from 'react';
import { TextareaFloatingActionButton } from './TextareaFloatingActionButton';
import { IconRenderer } from '../../../shared/utils/icon-renderer';

export interface TextareaAiEnhanceButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const TextareaAiEnhanceButton: React.FC<TextareaAiEnhanceButtonProps> = ({
  onClick,
  disabled = false,
}) => (
  <TextareaFloatingActionButton
    onClick={onClick}
    disabled={disabled}
    title="Enhance with AI"
  >
    <IconRenderer iconName="Sparkles" className="h-3.5 w-3.5" />
  </TextareaFloatingActionButton>
);

TextareaAiEnhanceButton.displayName = 'TextareaAiEnhanceButton';
