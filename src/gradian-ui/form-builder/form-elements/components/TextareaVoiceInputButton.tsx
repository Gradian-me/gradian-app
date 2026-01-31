'use client';

import React from 'react';
import { Mic } from 'lucide-react';
import { TextareaFloatingActionButton } from './TextareaFloatingActionButton';

export interface TextareaVoiceInputButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const TextareaVoiceInputButton: React.FC<TextareaVoiceInputButtonProps> = ({
  onClick,
  disabled = false,
}) => (
  <TextareaFloatingActionButton
    onClick={onClick}
    disabled={disabled}
    title="Voice Input"
  >
    <Mic className="h-3.5 w-3.5" />
  </TextareaFloatingActionButton>
);

TextareaVoiceInputButton.displayName = 'TextareaVoiceInputButton';
