/**
 * Message structure from API response
 */
export interface Message {
  path?: string;
  message: string | Record<string, string>; // Can be a string or an object with language keys
}

/**
 * Messages structure in API response
 */
export interface MessagesResponse {
  success?: boolean;
  messages?: Message[];
  message?: string | Record<string, string>; // Single message (can be string or object with language keys)
}

/**
 * MessageBox component props
 */
export interface MessageBoxProps {
  messages?: Message[];
  message?: string | Record<string, string>;
  statusCode?: number;
  className?: string;
  variant?: 'default' | 'error' | 'warning' | 'success' | 'info';
  dismissible?: boolean;
  onDismiss?: () => void;
}

