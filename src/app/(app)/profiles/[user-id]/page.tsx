'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { useUserProfile, userProfileToSections, ProfileCardHologram } from '@/gradian-ui/profile';
import { getDefaultLanguage } from '@/gradian-ui/shared/utils';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/stores/user.store';
import { useLanguageStore } from '@/stores/language.store';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const userIdFromParams = params['user-id'] as string;
  
  // Use logged-in user's ID if no user-id in params, or use params if provided
  const userId = userIdFromParams || user?.id;
  
  // Redirect to login if no user ID available
  useEffect(() => {
    if (!userId && !user) {
      router.push('/authentication/login');
    }
  }, [userId, user, router]);
  
  const { profile, loading, error } = useUserProfile(userId || '');
  const language = useLanguageStore((state) => state.language) ?? getDefaultLanguage();
  const layoutTitle = loading || error || !profile ? 'User Profile' : profile.fullName;
  useSetLayoutProps({ title: layoutTitle, showEndLine: false });

  const handleShare = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.share && profile) {
      navigator
        .share({
          title: profile.fullName,
          text: profile.bio ?? `${profile.fullName} - ${profile.jobTitle ?? profile.role}`,
          url: typeof window !== 'undefined' ? window.location.href : ''
        })
        .catch(() => {});
    } else if (typeof window !== 'undefined') {
      void navigator.clipboard?.writeText(window.location.href);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
        <p className="text-gray-600">{error || 'Unable to load user profile'}</p>
      </div>
    );
  }

  const sections = userProfileToSections(profile, { language, defaultLang: getDefaultLanguage() });

  const AVATAR_OVERRIDE: Record<string, string> = {
    '01K9ABA6MQ9K64MY7M4AEBCAP2': 'https://media.licdn.com/dms/image/v2/D4D03AQFqEf1NfTjObg/profile-displayphoto-scale_200_200/B4DZlbvgWeJMAc-/0/1758180806403?e=2147483647&v=beta&t=fx8fWBxcUl4Mpozqj9Hl-PEiM13AxJVC6Da_UexzHYE'
  };
  const avatarUrl = profile.id && AVATAR_OVERRIDE[profile.id] ? AVATAR_OVERRIDE[profile.id] : profile.avatar;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6"
    >
      <ProfileCardHologram
        avatarUrl={avatarUrl}
        iconUrl={"/logo/Gradian_Pattern.png"}
        name={profile.fullName}
        title={profile.jobTitle ?? profile.role}
        status={profile.availability ?? 'Online'}
        email={profile.email}
        entityType={profile.entityType}
        showUserInfo
        sections={sections}
        onContactClick={
          profile.email
            ? () => {
                window.location.href = `mailto:${profile.email}`;
              }
            : undefined
        }
        onShareClick={handleShare}
      />
    </motion.div>
  );
}

