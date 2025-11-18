// Profile Types

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  initials?: string;
  role: string;
  department?: string;
  jobTitle?: string;
  location?: string;
  bio?: string;
  joinedAt?: Date | string;
  lastLogin?: Date | string;
  metadata?: Record<string, any>;
  metrics?: {
    projects?: number;
    experience?: number;
    rating?: number;
  };
  availability?: string;
}

export interface ProfileSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: ProfileField[];
  colSpan?: number;
  layout?: {
    columns?: number;
    gap?: number;
  };
  styling?: {
    variant?: 'default' | 'card' | 'minimal';
    className?: string;
  };
}

export interface ProfileField {
  id: string;
  name: string;
  label: string;
  value: any;
  type?: 'text' | 'email' | 'tel' | 'number' | 'url' | 'date' | 'badge' | 'custom';
  icon?: string;
  format?: 'default' | 'currency' | 'percentage' | 'date' | 'phone' | 'email';
  options?: Array<{ label: string; value: string; icon?: string; color?: string }>;
}

export interface ProfileConfig {
  avatarSize?: 'sm' | 'md' | 'lg' | 'xl';
  avatarVariant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  showHeader?: boolean;
  showActions?: boolean;
  actions?: Array<'edit' | 'message' | 'share'>;
  layout?: 'default' | 'compact' | 'expanded';
}

export interface ProfilePageProps {
  userId: string;
  config?: ProfileConfig;
  onEdit?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  onShare?: (userId: string) => void;
  customSections?: ProfileSection[];
}

