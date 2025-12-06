'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Avatar } from '@/gradian-ui/form-builder/form-elements';
import { useUserProfile, userProfileToSections, getUserInitials, ProfileCard } from '@/gradian-ui/profile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Mail, Share2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/stores/user.store';

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
  
  if (loading) {
    return (
      <MainLayout title="User Profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }
  
  if (error || !profile) {
    return (
      <MainLayout title="User Profile">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600">{error || 'Unable to load user profile'}</p>
        </div>
      </MainLayout>
    );
  }
  
  const sections = userProfileToSections(profile);
  
  return (
    <MainLayout title={profile.fullName}>
      <div className="space-y-6">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-lg p-8 dark:border-gray-800 bg-white dark:bg-gray-900 isolate"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-sky-500/10 to-transparent dark:from-violet-500/20 dark:via-sky-500/15" />
          <div className="absolute -top-16 -right-14 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative z-10">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              <Avatar
                src={profile.avatar}
                alt={profile.fullName}
                fallback={getUserInitials(profile)}
                size="3xl"
                variant="primary"
                className="border-4 border-white shadow-lg dark:border-gray-900"
              />
            </div>
            
            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{profile.fullName}</h1>
                {profile.jobTitle && (
                  <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">{profile.jobTitle}</p>
                )}
              </div>
              
              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 max-w-2xl">{profile.bio}</p>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" className="dark:border-gray-700 dark:text-gray-200">
                  <Mail className="h-4 w-4 me-2" />
                  Message
                </Button>
                <Button variant="outline" size="sm" className="dark:border-gray-700 dark:text-gray-200">
                  <Share2 className="h-4 w-4 me-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="dark:border-gray-700 dark:text-gray-200">
                  <Edit className="h-4 w-4 me-2" />
                  Edit Profile
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Projects</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{profile.metrics?.projects ?? 12}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Experience</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{profile.metrics?.experience ?? 8}<span className="text-sm font-medium text-gray-500 dark:text-gray-300 ms-1">yrs</span></p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Rating</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center justify-center gap-1">{profile.metrics?.rating ?? 4.8}<span className="text-xs text-amber-500">★</span></p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Availability</p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{profile.availability ?? 'I am not available'}</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
        
        {/* Profile Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={section.colSpan === 2 ? "lg:col-span-2" : ""}
            >
              <ProfileCard section={section} />
            </motion.div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

