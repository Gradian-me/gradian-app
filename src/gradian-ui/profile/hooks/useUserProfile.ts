// User Profile Hook

import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getUserInitials } from '../utils';
import { config } from '@/lib/config';
import { resolveLocalizedField } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';

export interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isValid: boolean;
  validationErrors: string[];
  refetch: () => void;
}

/**
 * Convert API user data to UserProfile format
 */
function convertUserToProfile(user: any, language: string): UserProfile {
  const firstName = resolveLocalizedField(user.name, language, 'en');
  const lastName = resolveLocalizedField(user.lastname, language, 'en');
  const fullName = lastName 
    ? `${firstName} ${lastName}`.trim()
    : firstName;

  return {
    id: user.id,
    firstName,
    lastName,
    fullName,
    email: user.email || '',
    phone: user.phone || undefined,
    avatar: user.avatar || user.avatarUrl || undefined,
    initials: getUserInitials({ 
      firstName, 
      lastName, 
      fullName,
      email: user.email || ''
    } as UserProfile),
    role: user.role || 'user',
    department: user.department || undefined,
    jobTitle: user.jobTitle || undefined,
    location: user.location || undefined,
    bio: user.bio || undefined,
    joinedAt: user.createdAt ? new Date(user.createdAt) : undefined,
    lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
    metadata: user.metadata || {}
  };
}

export const useUserProfile = (userId: string): UseUserProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rawUser, setRawUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const language = useLanguageStore((state) => state.language || 'en');

  const fetchProfile = async () => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Fetch user data from API (uses config to determine correct URL based on demo mode)
      const apiUrl = `${config.dataApi.basePath}/users/${userId}`;
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch user profile');
      }

      // Convert API user data to UserProfile format
      setRawUser(result.data);
      setIsValid(true);
      setValidationErrors([]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user profile';
      setError(errorMessage);
      setIsValid(false);
      setValidationErrors([errorMessage]);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (rawUser) {
      setProfile(convertUserToProfile(rawUser, language));
    } else {
      setProfile(null);
    }
  }, [rawUser, language]);

  return {
    profile,
    loading,
    error,
    isValid,
    validationErrors,
    refetch: fetchProfile
  };
};

