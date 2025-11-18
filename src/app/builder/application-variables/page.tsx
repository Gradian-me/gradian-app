'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

interface ApplicationVariablesData {
  LOG_CONFIG: Record<string, boolean>;
  AUTH_CONFIG: {
    ACCESS_TOKEN_COOKIE?: string;
    REFRESH_TOKEN_COOKIE?: string;
    USERS_API_PATH?: string;
    JWT_SECRET?: string;
    ACCESS_TOKEN_EXPIRY?: number;
    REFRESH_TOKEN_EXPIRY?: number;
    ERROR_MESSAGES?: Record<string, string>;
  };
  UI_PARAMS: {
    CARD_INDEX_DELAY?: {
      STEP?: number;
      MAX?: number;
      SKELETON_MAX?: number;
    };
  };
  SCHEMA_SUMMARY_EXCLUDED_KEYS: string[];
  DEMO_MODE?: boolean;
}

export default function ApplicationVariablesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ApplicationVariablesData>({
    LOG_CONFIG: {},
    AUTH_CONFIG: {},
    UI_PARAMS: {},
    SCHEMA_SUMMARY_EXCLUDED_KEYS: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/application-variables');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error || 'Failed to load application variables');
      }
    } catch (error) {
      toast.error('Failed to load application variables');
      console.error('Error fetching application variables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/application-variables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Clear client-side caches by dispatching event
        if (typeof window !== 'undefined') {
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('application-variables-updated'));
          
          // Also use localStorage to notify other tabs/windows
          window.localStorage.setItem('application-variables-updated', Date.now().toString());
          window.localStorage.removeItem('application-variables-updated');
        }

        toast.success('Application variables updated successfully. Reloading page...');
        
        // Force refresh the router to reload server-side data
        router.refresh();
        
        // Reload the entire page to ensure all modules reload with new variables
        // Wait a brief moment for the toast to be visible
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(result.error || 'Failed to update application variables');
      }
    } catch (error) {
      toast.error('Failed to update application variables');
      console.error('Error updating application variables:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateLogConfig = (key: string, value: boolean) => {
    setData((prev) => ({
      ...prev,
      LOG_CONFIG: {
        ...prev.LOG_CONFIG,
        [key]: value,
      },
    }));
  };

  const updateAuthConfig = (key: string, value: string | number) => {
    setData((prev) => ({
      ...prev,
      AUTH_CONFIG: {
        ...prev.AUTH_CONFIG,
        [key]: typeof value === 'string' && !isNaN(Number(value)) && key.includes('EXPIRY') 
          ? parseInt(value, 10) 
          : value,
      },
    }));
  };

  const updateAuthErrorMessage = (key: string, value: string) => {
    setData((prev) => ({
      ...prev,
      AUTH_CONFIG: {
        ...prev.AUTH_CONFIG,
        ERROR_MESSAGES: {
          ...(prev.AUTH_CONFIG.ERROR_MESSAGES || {}),
          [key]: value,
        },
      },
    }));
  };

  const updateUIParams = (key: string, value: number) => {
    setData((prev) => ({
      ...prev,
      UI_PARAMS: {
        ...prev.UI_PARAMS,
        CARD_INDEX_DELAY: {
          ...prev.UI_PARAMS.CARD_INDEX_DELAY,
          [key]: value,
        },
      },
    }));
  };

  const updateSchemaSummaryKeys = (index: number, value: string) => {
    setData((prev) => {
      const newKeys = [...(prev.SCHEMA_SUMMARY_EXCLUDED_KEYS || [])];
      newKeys[index] = value;
      return {
        ...prev,
        SCHEMA_SUMMARY_EXCLUDED_KEYS: newKeys,
      };
    });
  };

  const addSchemaSummaryKey = () => {
    setData((prev) => ({
      ...prev,
      SCHEMA_SUMMARY_EXCLUDED_KEYS: [...(prev.SCHEMA_SUMMARY_EXCLUDED_KEYS || []), ''],
    }));
  };

  const removeSchemaSummaryKey = (index: number) => {
    setData((prev) => ({
      ...prev,
      SCHEMA_SUMMARY_EXCLUDED_KEYS: prev.SCHEMA_SUMMARY_EXCLUDED_KEYS.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <MainLayout
        title="Application Variables"
        subtitle="Configure application-wide constants and settings"
        icon="Settings"
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Application Variables"
      subtitle="Configure application-wide constants and settings"
      icon="Settings"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/builder')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Configuration Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="logging">Logging</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="ui">UI Parameters</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
          </TabsList>

          {/* General Configuration */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>
                  Configure general application settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Demo Mode</Label>
                    <p className="text-sm text-gray-500">
                      When enabled, the app uses local file-based storage. When disabled, it proxies requests to external services.
                    </p>
                  </div>
                  <Switch
                    checked={data.DEMO_MODE ?? true}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, DEMO_MODE: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logging Configuration */}
          <TabsContent value="logging" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Log Configuration</CardTitle>
                <CardDescription>
                  Enable or disable logging for different parts of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.values(LogType).map((logType) => (
                  <div
                    key={logType}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-0.5">
                      <Label className="text-base">{logType}</Label>
                      <p className="text-sm text-gray-500">
                        {logType === LogType.FORM_DATA && 'Log form data submissions'}
                        {logType === LogType.REQUEST_BODY && 'Log request body data'}
                        {logType === LogType.REQUEST_RESPONSE && 'Log request/response data'}
                        {logType === LogType.SCHEMA_LOADER && 'Log schema loading operations'}
                        {logType === LogType.CALL_BACKEND && 'Log backend API calls'}
                        {logType === LogType.INDEXDB_CACHE && 'Log IndexDB cache operations'}
                        {logType === LogType.INTEGRATION_LOG && 'Log integration operations'}
                      </p>
                    </div>
                    <Switch
                      checked={data.LOG_CONFIG[logType] ?? false}
                      onCheckedChange={(checked) => updateLogConfig(logType, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication Configuration */}
          <TabsContent value="auth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Configuration</CardTitle>
                <CardDescription>
                  Configure authentication settings and cookie names
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">JWT Configuration</Label>
                    <p className="text-sm text-gray-500 mb-4">
                      Configure JWT token settings (fallback values when environment variables are not set)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jwt-secret">JWT Secret (Fallback)</Label>
                    <Input
                      id="jwt-secret"
                      type="password"
                      value={data.AUTH_CONFIG.JWT_SECRET || ''}
                      onChange={(e) => updateAuthConfig('JWT_SECRET', e.target.value)}
                      placeholder="your-default-secret-key-change-in-production"
                    />
                    <p className="text-xs text-gray-500">
                      Fallback value used when JWT_SECRET or NEXTAUTH_SECRET environment variables are not set
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access-token-expiry">Access Token Expiry (seconds)</Label>
                    <Input
                      id="access-token-expiry"
                      type="number"
                      value={data.AUTH_CONFIG.ACCESS_TOKEN_EXPIRY || 3600}
                      onChange={(e) => updateAuthConfig('ACCESS_TOKEN_EXPIRY', e.target.value)}
                      placeholder="3600"
                    />
                    <p className="text-xs text-gray-500">
                      Default: 3600 seconds (1 hour). Fallback value when JWT_ACCESS_TOKEN_EXPIRY is not set
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refresh-token-expiry">Refresh Token Expiry (seconds)</Label>
                    <Input
                      id="refresh-token-expiry"
                      type="number"
                      value={data.AUTH_CONFIG.REFRESH_TOKEN_EXPIRY || 604800}
                      onChange={(e) => updateAuthConfig('REFRESH_TOKEN_EXPIRY', e.target.value)}
                      placeholder="604800"
                    />
                    <p className="text-xs text-gray-500">
                      Default: 604800 seconds (7 days). Fallback value when JWT_REFRESH_TOKEN_EXPIRY is not set
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Cookie Configuration</Label>
                    <p className="text-sm text-gray-500 mb-4">
                      Configure cookie names for authentication tokens
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access-token-cookie">Access Token Cookie Name</Label>
                    <Input
                      id="access-token-cookie"
                      value={data.AUTH_CONFIG.ACCESS_TOKEN_COOKIE || ''}
                      onChange={(e) => updateAuthConfig('ACCESS_TOKEN_COOKIE', e.target.value)}
                      placeholder="auth_token"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refresh-token-cookie">Refresh Token Cookie Name</Label>
                    <Input
                      id="refresh-token-cookie"
                      value={data.AUTH_CONFIG.REFRESH_TOKEN_COOKIE || ''}
                      onChange={(e) => updateAuthConfig('REFRESH_TOKEN_COOKIE', e.target.value)}
                      placeholder="refresh_token"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="users-api-path">Users API Path</Label>
                  <Input
                    id="users-api-path"
                    value={data.AUTH_CONFIG.USERS_API_PATH || ''}
                    onChange={(e) => updateAuthConfig('USERS_API_PATH', e.target.value)}
                    placeholder="/api/data/users"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Error Messages</Label>
                    <p className="text-sm text-gray-500 mb-4">
                      Customize error messages shown to users
                    </p>
                  </div>
                  {['USER_NOT_FOUND', 'INVALID_PASSWORD', 'INVALID_TOKEN', 'MISSING_TOKEN', 'TOKEN_EXPIRED', 'UNAUTHORIZED', 'LOGIN_REQUIRED'].map((key) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`error-${key}`}>{key.replace(/_/g, ' ')}</Label>
                      <Input
                        id={`error-${key}`}
                        value={data.AUTH_CONFIG.ERROR_MESSAGES?.[key] || ''}
                        onChange={(e) => updateAuthErrorMessage(key, e.target.value)}
                        placeholder={`Enter error message for ${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* UI Parameters */}
          <TabsContent value="ui" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>UI Parameters</CardTitle>
                <CardDescription>
                  Configure UI animation delays and timing parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-4 block">
                    Card Index Delay
                  </Label>
                  <div className="space-y-4 pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label htmlFor="step-delay">Step Delay (seconds)</Label>
                      <Input
                        id="step-delay"
                        type="number"
                        step="0.01"
                        value={data.UI_PARAMS.CARD_INDEX_DELAY?.STEP || 0.05}
                        onChange={(e) =>
                          updateUIParams('STEP', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.05"
                      />
                      <p className="text-xs text-gray-500">
                        Delay increment between each card animation
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-delay">Max Delay (seconds)</Label>
                      <Input
                        id="max-delay"
                        type="number"
                        step="0.01"
                        value={data.UI_PARAMS.CARD_INDEX_DELAY?.MAX || 0.4}
                        onChange={(e) =>
                          updateUIParams('MAX', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.4"
                      />
                      <p className="text-xs text-gray-500">
                        Maximum delay for card animations
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skeleton-max-delay">Skeleton Max Delay (seconds)</Label>
                      <Input
                        id="skeleton-max-delay"
                        type="number"
                        step="0.01"
                        value={data.UI_PARAMS.CARD_INDEX_DELAY?.SKELETON_MAX || 0.25}
                        onChange={(e) =>
                          updateUIParams('SKELETON_MAX', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.25"
                      />
                      <p className="text-xs text-gray-500">
                        Maximum delay for skeleton loading animations
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schema Configuration */}
          <TabsContent value="schema" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Schema Summary Configuration</CardTitle>
                <CardDescription>
                  Configure keys to exclude from schema summaries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {data.SCHEMA_SUMMARY_EXCLUDED_KEYS.map((key, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={key}
                        onChange={(e) => updateSchemaSummaryKeys(index, e.target.value)}
                        placeholder="Enter key name"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSchemaSummaryKey(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={addSchemaSummaryKey}
                  className="w-full"
                >
                  Add Key
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

