'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Palette,
  Save,
  User
} from 'lucide-react';
import { useState, useEffect } from 'react';
// Import Gradian UI form components
import { Switch } from '@/gradian-ui/form-builder/form-elements/components/Switch';
import { Label } from '@/gradian-ui/form-builder/form-elements/components/Label';
import { EmailInput } from '@/gradian-ui/form-builder/form-elements/components/EmailInput';
import { PhoneInput } from '@/gradian-ui/form-builder/form-elements/components/PhoneInput';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { TextInput } from '@/gradian-ui/form-builder/form-elements/components/TextInput';
// Import settings domain
import { useSettings, SettingsUpdate } from '@/domains/settings';
// Import user store
import { useUserStore } from '@/stores/user.store';
import { config } from '@/lib/config';

export default function SettingsPage() {
  // Settings now get userId from JWT token automatically
  const { settings, loading, error, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('profile');
  const [localSettings, setLocalSettings] = useState<SettingsUpdate | null>(null);
  const [userData, setUserData] = useState<{ name: string; lastname?: string; email: string; avatar?: string; language?: string; timezone?: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [userLanguage, setUserLanguage] = useState<string>('');
  const [userTimezone, setUserTimezone] = useState<string>('');

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get userId from store to fetch user data
        const userId = useUserStore.getState().getUserId();
        if (userId) {
          // Use config to determine correct URL based on demo mode
          const apiUrl = `${config.dataApi.basePath}/users/${userId}`;
          const response = await fetch(apiUrl, {
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setUserData({
                name: result.data.name || '',
                lastname: result.data.lastname || '',
                email: result.data.email || '',
                avatar: result.data.avatar || result.data.avatarUrl || '',
                language: result.data.language || '',
                timezone: result.data.timezone || '',
              });
              setAvatarUrl(result.data.avatar || result.data.avatarUrl || '');
              setUserLanguage(result.data.language || '');
              setUserTimezone(result.data.timezone || '');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();
  }, []);

  // Initialize local settings from loaded settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        profile: { ...settings.profile },
        notifications: { ...settings.notifications },
        appearance: { ...settings.appearance },
      });
    }
  }, [settings]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const handleSave = async () => {
    if (!localSettings || !settings) return;
    
    try {
      // Get userId to update user avatar
      const userId = useUserStore.getState().getUserId();
      
      // Update user data (avatar, language, timezone) if changed
      if (userId) {
        const userUpdates: any = {};
        let hasUserUpdates = false;

        if (avatarUrl !== (userData?.avatar || '')) {
          userUpdates.avatar = avatarUrl;
          hasUserUpdates = true;
        }

        if (userLanguage !== (userData?.language || '')) {
          userUpdates.language = userLanguage;
          hasUserUpdates = true;
        }

        if (userTimezone !== (userData?.timezone || '')) {
          userUpdates.timezone = userTimezone;
          hasUserUpdates = true;
        }

        if (hasUserUpdates) {
          try {
            // Use config to determine correct URL based on demo mode
            const apiUrl = `${config.dataApi.basePath}/users/${userId}`;
            const userResponse = await fetch(apiUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userUpdates),
            });

            if (userResponse.ok) {
              const userResult = await userResponse.json();
              if (userResult.success && userResult.data) {
                setUserData(prev => ({
                  ...prev!,
                  avatar: userResult.data.avatar || userResult.data.avatarUrl || prev?.avatar,
                  language: userResult.data.language || prev?.language,
                  timezone: userResult.data.timezone || prev?.timezone,
                }));
              }
            }
          } catch (err) {
            console.error('Error updating user data:', err);
          }
        }
      }
      
      // Prepare updates - only include changed fields
      // Note: name, lastname, email are not updatable from settings
      const updates: SettingsUpdate = {};
      
      // Only include editable profile fields (not name, email - these are read-only)
      if (localSettings.profile) {
        const profileUpdate: any = { ...localSettings.profile };
        // Remove name, email - these are read-only
        delete profileUpdate.name;
        delete profileUpdate.email;
        // Only include if there are other fields to update
        if (Object.keys(profileUpdate).length > 0) {
          updates.profile = profileUpdate;
        }
      }
      if (localSettings.notifications) {
        updates.notifications = localSettings.notifications;
      }
      if (localSettings.appearance) {
        updates.appearance = localSettings.appearance;
      }
      
      const updatedSettings = await updateSettings(updates);
      
      // Update local settings with the returned settings (which include defaults merged)
      if (updatedSettings) {
        setLocalSettings({
          profile: { ...updatedSettings.profile },
          notifications: { ...updatedSettings.notifications },
          appearance: { ...updatedSettings.appearance },
        });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Settings">
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-600">Loading settings...</div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Settings">
        <div className="flex items-center justify-center p-8">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </MainLayout>
    );
  }

  if (!settings || !localSettings) {
    return (
      <MainLayout title="Settings">
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-600">No settings found</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-100 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                          activeTab === tab.id ? 'bg-violet-100 text-violet-600 border-b-2 last:border-b-0 border-violet-600' : 'text-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="lg:col-span-3"
          >
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                      config={{
                        name: 'name',
                        label: 'First Name',
                        type: 'text',
                        placeholder: 'First name'
                      }}
                      value={userData?.name || ''}
                      onChange={() => {}} // Disabled - read-only
                      disabled={true}
                    />
                    <TextInput
                      config={{
                        name: 'lastname',
                        label: 'Last Name',
                        type: 'text',
                        placeholder: 'Last name'
                      }}
                      value={userData?.lastname || ''}
                      onChange={() => {}} // Disabled - read-only
                      disabled={true}
                      />
                    <EmailInput
                      config={{
                        name: 'email',
                        label: 'Email',
                        type: 'email',
                        placeholder: 'Email address'
                      }}
                      value={userData?.email || ''}
                      onChange={() => {}} // Disabled - read-only
                      disabled={true}
                      />
                    <TextInput
                      config={{
                        name: 'avatar',
                        label: 'Avatar URL',
                        type: 'url',
                        placeholder: 'Enter avatar image URL'
                      }}
                      value={avatarUrl}
                      onChange={(value: string) => setAvatarUrl(value)}
                    />
                    <TextInput
                      config={{
                        name: 'role',
                        label: 'Role',
                        type: 'text',
                        placeholder: 'Enter your role'
                      }}
                        value={localSettings?.profile?.role || ''}
                      onChange={(value: string) => setLocalSettings(prev => ({
                          ...prev,
                        profile: { ...prev?.profile || settings.profile, role: value }
                        }))}
                      />
                    <TextInput
                      config={{
                        name: 'department',
                        label: 'Department',
                        type: 'text',
                        placeholder: 'Enter your department'
                      }}
                        value={localSettings?.profile?.department || ''}
                      onChange={(value: string) => setLocalSettings(prev => ({
                          ...prev,
                        profile: { ...prev?.profile || settings.profile, department: value }
                        }))}
                      />
                    <PhoneInput
                      config={{
                        name: 'phone',
                        label: 'Phone',
                        type: 'tel',
                        placeholder: 'Enter your phone number'
                      }}
                        value={localSettings?.profile?.phone || ''}
                      onChange={(value: string) => setLocalSettings(prev => ({
                          ...prev,
                        profile: { ...prev?.profile || settings.profile, phone: value }
                        }))}
                      />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                                    {/* Communication Channels */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Communication Channels</Label>
                    <div className="space-y-4 pl-4 border-s-2 border-violet-200 dark:border-violet-800 mt-4">
                       <Switch
                         config={{
                           name: 'emailNotifications',
                           label: 'Email Notifications - Receive notifications via email',
                           type: 'switch'
                         }}
                         value={localSettings?.notifications?.emailNotifications ?? true}
                         onChange={(checked: boolean) => setLocalSettings(prev => ({
                          ...prev,
                           notifications: { ...prev?.notifications || settings.notifications, emailNotifications: checked }
                        }))}
                      />
                       <Switch
                         config={{
                           name: 'pushNotifications',
                           label: 'Push Notifications - Receive push notifications in browser',
                           type: 'switch'
                         }}
                         value={localSettings?.notifications?.pushNotifications ?? true}
                         onChange={(checked: boolean) => setLocalSettings(prev => ({
                          ...prev,
                           notifications: { ...prev?.notifications || settings.notifications, pushNotifications: checked }
                        }))}
                      />
                    </div>
                      </div>

                                    {/* Business Updates */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Business Updates</Label>
                    <div className="space-y-4 pl-4 border-s-2 border-violet-200 dark:border-violet-800mt-4">
                       <Switch
                         config={{
                           name: 'tenderUpdates',
                           label: 'Tender Updates - Get notified about tender changes',
                           type: 'switch'
                         }}
                         value={localSettings?.notifications?.tenderUpdates ?? true}
                         onChange={(checked: boolean) => setLocalSettings(prev => ({
                          ...prev,
                           notifications: { ...prev?.notifications || settings.notifications, tenderUpdates: checked }
                        }))}
                      />
                       <Switch
                         config={{
                           name: 'vendorUpdates',
                           label: 'Vendor Updates - Get notified about vendor changes',
                           type: 'switch'
                         }}
                         value={localSettings?.notifications?.vendorUpdates ?? true}
                         onChange={(checked: boolean) => setLocalSettings(prev => ({
                          ...prev,
                           notifications: { ...prev?.notifications || settings.notifications, vendorUpdates: checked }
                        }))}
                      />
                    </div>
                      </div>

                                    {/* System Notifications */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">System Notifications</Label>
                    <div className="space-y-4 pl-4 border-s-2 border-violet-200 dark:border-violet-800 mt-4">
                       <Switch
                         config={{
                           name: 'systemAlerts',
                           label: 'System Alerts - Get notified about system issues',
                           type: 'switch'
                         }}
                         value={localSettings?.notifications?.systemAlerts ?? true}
                         onChange={(checked: boolean) => setLocalSettings(prev => ({
                          ...prev,
                           notifications: { ...prev?.notifications || settings.notifications, systemAlerts: checked }
                        }))}
                      />
                      </div>
                    </div>
                </CardContent>
              </Card>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <Select
                      config={{
                        name: 'theme',
                        label: 'Theme',
                        type: 'select',
                        placeholder: 'Select theme'
                      }}
                        value={localSettings?.appearance?.theme ?? settings.appearance.theme}
                      onValueChange={(value: string) => setLocalSettings(prev => ({
                          ...prev,
                        appearance: { ...prev?.appearance || settings.appearance, theme: value as 'light' | 'dark' | 'auto' }
                        }))}
                      options={[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                        { label: 'Auto', value: 'auto' }
                      ]}
                    />
                    <Select
                      config={{
                        name: 'language',
                        label: 'Language',
                        type: 'select',
                        placeholder: 'Select language'
                      }}
                        value={userLanguage || (localSettings?.appearance?.language ?? settings.appearance.language)}
                      onValueChange={(value: string) => {
                        setUserLanguage(value);
                        setLocalSettings(prev => ({
                          ...prev,
                          appearance: { ...prev?.appearance || settings.appearance, language: value }
                        }));
                      }}
                      options={[
                        { label: 'English', value: 'en' },
                        { label: 'Spanish', value: 'es' },
                        { label: 'French', value: 'fr' },
                        { label: 'German', value: 'de' },
                        { label: 'Arabic', value: 'ar' },
                        { label: 'Persian', value: 'fa' }
                      ]}
                    />
                    <Select
                      config={{
                        name: 'timezone',
                        label: 'Timezone',
                        type: 'select',
                        placeholder: 'Select timezone'
                      }}
                        value={(userTimezone || localSettings?.appearance?.timezone) ?? settings.appearance.timezone}
                      onValueChange={(value: string) => {
                        setUserTimezone(value);
                        setLocalSettings(prev => ({
                          ...prev,
                          appearance: { ...prev?.appearance || settings.appearance, timezone: value }
                        }));
                      }}
                      options={[
                        { label: 'Eastern Time (ET)', value: 'America/New_York' },
                        { label: 'Central Time (CT)', value: 'America/Chicago' },
                        { label: 'Mountain Time (MT)', value: 'America/Denver' },
                        { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
                        { label: 'UTC', value: 'UTC' },
                        { label: 'Europe/London', value: 'Europe/London' },
                        { label: 'Europe/Berlin', value: 'Europe/Berlin' },
                        { label: 'Asia/Dubai', value: 'Asia/Dubai' },
                        { label: 'Asia/Tehran', value: 'Asia/Tehran' },
                        { label: 'Asia/Tokyo', value: 'Asia/Tokyo' }
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
