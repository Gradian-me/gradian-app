'use client';

import React from 'react';
import { MessageBox } from './MessageBox';
import { MessagesResponse } from '../types';

export interface MessageBoxContainerProps {
  response?: MessagesResponse | any;
  variant?: 'default' | 'error' | 'warning' | 'success' | 'info';
  dismissible?: boolean;
  className?: string;
  onDismiss?: () => void;
}

/**
 * Container component that extracts messages from API response
 * and displays them using MessageBox
 */
export const MessageBoxContainer: React.FC<MessageBoxContainerProps> = ({
  response,
  variant = 'default',
  dismissible = false,
  className,
  onDismiss,
}) => {
  if (!response) {
    return null;
  }

  // Extract messages from response
  const messages = response.messages || [];
  const message = response.message;
  const statusCode = response.statusCode;

  // If no messages found, don't render
  if (!messages.length && !message) {
    return null;
  }

  return (
    <MessageBox
      messages={messages}
      message={message}
      statusCode={statusCode}
      variant={variant}
      dismissible={dismissible}
      className={className}
      onDismiss={onDismiss}
    />
  );
};

MessageBoxContainer.displayName = 'MessageBoxContainer';

