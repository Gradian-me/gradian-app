'use client';

import { useRouter } from 'next/navigation';
import { encryptReturnUrl } from '@/gradian-ui/shared/utils/url-encryption.util';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  FormTabs,
  FormTabsList,
  FormTabsTrigger,
  FormTabsContent,
} from '@/gradian-ui/form-builder/form-elements';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { LogType, FORBIDDEN_ROUTES_PRODUCTION } from '@/gradian-ui/shared/constants/application-variables';
import { Skeleton } from '@/components/ui/skeleton';

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
  LOGIN_LOCALLY?: boolean;
  AD_MODE?: boolean;
  REQUIRE_LOGIN?: boolean;
  EXCLUDED_LOGIN_ROUTES?: string[];
  FORBIDDEN_ROUTES_PRODUCTION?: string[];
  AI_CONFIG?: {
    LLM_API_URL?: string;
  };
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
    EXCLUDED_LOGIN_ROUTES: [],
    FORBIDDEN_ROUTES_PRODUCTION: [],
    AI_CONFIG: {},
  });

  // Redirect to Forbidden if not in development environment and route is in FORBIDDEN_ROUTES_PRODUCTION
  useEffect(() => {
    const forbiddenRoutes = FORBIDDEN_ROUTES_PRODUCTION ?? [];
    if (forbiddenRoutes.length > 0) {
      // Check NODE_ENV - in Next.js, NODE_ENV is available on both client and server
      // It's replaced at build time, so it's safe to check
      const nodeEnv = process.env.NODE_ENV || 'production';
      const isDev = nodeEnv === 'development';
      
      // Check if current path is in forbidden routes
      const currentPath = window.location.pathname;
      const isForbidden = forbiddenRoutes.some((route: string) => 
        currentPath === route || currentPath.startsWith(route)
      );
      
      if (!isDev && isForbidden) {
        router.replace('/forbidden');
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, []);

  // Check authentication if REQUIRE_LOGIN is enabled
  useEffect(() => {
    const checkAuthentication = async () => {
      if (data.REQUIRE_LOGIN) {
        try {
          const response = await fetch('/api/auth/token/validate', {
            method: 'GET',
            credentials: 'include',
          });
          const result = await response.json();

          if (!result.success || !result.valid) {
            // Not authenticated, redirect to login
            const encryptedReturnUrl = encryptReturnUrl(window.location.pathname);
            router.push(`/authentication/login?returnUrl=${encryptedReturnUrl}`);
          }
        } catch (error) {
          console.error('Error checking authentication:', error);
          // On error, redirect to login
          const encryptedReturnUrl = encryptReturnUrl(window.location.pathname);
          router.push(`/authentication/login?returnUrl=${encryptedReturnUrl}`);
        }
      }
    };

    if (!loading && data.REQUIRE_LOGIN !== undefined) {
      checkAuthentication();
    }
  }, [data.REQUIRE_LOGIN, loading, router]);

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

  const updateExcludedLoginRoute = (index: number, value: string) => {
    setData((prev) => {
      const newRoutes = [...(prev.EXCLUDED_LOGIN_ROUTES || [])];
      newRoutes[index] = value;
      return {
        ...prev,
        EXCLUDED_LOGIN_ROUTES: newRoutes,
      };
    });
  };

  const addExcludedLoginRoute = () => {
    setData((prev) => ({
      ...prev,
      EXCLUDED_LOGIN_ROUTES: [...(prev.EXCLUDED_LOGIN_ROUTES || []), ''],
    }));
  };

  const removeExcludedLoginRoute = (index: number) => {
    setData((prev) => ({
      ...prev,
      EXCLUDED_LOGIN_ROUTES: prev.EXCLUDED_LOGIN_ROUTES?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateForbiddenRoute = (index: number, value: string) => {
    setData((prev) => {
      const newRoutes = [...(prev.FORBIDDEN_ROUTES_PRODUCTION || [])];
      newRoutes[index] = value;
      return {
        ...prev,
        FORBIDDEN_ROUTES_PRODUCTION: newRoutes,
      };
    });
  };

  const addForbiddenRoute = () => {
    setData((prev) => ({
      ...prev,
      FORBIDDEN_ROUTES_PRODUCTION: [...(prev.FORBIDDEN_ROUTES_PRODUCTION || []), ''],
    }));
  };

  const removeForbiddenRoute = (index: number) => {
    setData((prev) => ({
      ...prev,
      FORBIDDEN_ROUTES_PRODUCTION: prev.FORBIDDEN_ROUTES_PRODUCTION?.filter((_, i) => i !== index) || [],
    }));
  };

  if (loading) {
    return (
      <MainLayout
        title="Application Variables"
        subtitle="Configure application-wide constants and settings"
        icon="Settings"
      >
        <div className="space-y-6">
          {/* Header Actions Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-36" />
            </div>

            {/* Card Content Skeleton */}
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-80" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-80" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-80" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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
            <ArrowLeft className="h-4 w-4 me-2" />
            Back to Builder
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 me-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Configuration Tabs */}
        <FormTabs defaultValue="general" className="w-full">
          <FormTabsList 
            className="bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 select-none"
            showScrollBar={true}
            scrollAreaClassName="w-full"
          >
            <FormTabsTrigger value="general" className="px-4 py-1.5 text-sm shrink-0">
              General
            </FormTabsTrigger>
            <FormTabsTrigger value="logging" className="px-4 py-1.5 text-sm shrink-0">
              Logging
            </FormTabsTrigger>
            <FormTabsTrigger value="auth" className="px-4 py-1.5 text-sm shrink-0">
              Authentication
            </FormTabsTrigger>
            <FormTabsTrigger value="ui" className="px-4 py-1.5 text-sm shrink-0">
              UI Parameters
            </FormTabsTrigger>
            <FormTabsTrigger value="schema" className="px-4 py-1.5 text-sm shrink-0">
              Schema
            </FormTabsTrigger>
            <FormTabsTrigger value="ai" className="px-4 py-1.5 text-sm shrink-0">
              AI Configuration
            </FormTabsTrigger>
          </FormTabsList>

          {/* General Configuration */}
          <FormTabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>
                  Configure general application settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Demo Mode</Label>
                    <p className="text-sm text-gray-500">
                      When enabled, the app uses local file-based storage for data and schemas. When disabled, it proxies those requests to external services.
                    </p>
                  </div>
                  <Switch
                    checked={data.DEMO_MODE ?? true}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, DEMO_MODE: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Login Locally</Label>
                    <p className="text-sm text-gray-500">
                      When enabled, login and logout use local demo users instead of the external authentication service. When disabled, authentication always goes to the server.
                    </p>
                  </div>
                  <Switch
                    checked={data.LOGIN_LOCALLY ?? false}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, LOGIN_LOCALLY: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">AD Mode</Label>
                    <p className="text-sm text-gray-500">
                      When enabled, the application will use Active Directory–specific behavior (e.g., login and integration modes).
                    </p>
                  </div>
                  <Switch
                    checked={data.AD_MODE ?? false}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, AD_MODE: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Require Login</Label>
                    <p className="text-sm text-gray-500">
                      When enabled, all pages will require authentication except those listed in Excluded Login Routes. Users will be redirected to the login page if not authenticated.
                    </p>
                  </div>
                  <Switch
                    checked={data.REQUIRE_LOGIN ?? false}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, REQUIRE_LOGIN: checked }))}
                  />
                </div>
                {data.REQUIRE_LOGIN && (
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4">
                    <div className="space-y-2">
                      <Label>Excluded Login Routes</Label>
                      <p className="text-sm text-gray-500">
                        Routes that should not require authentication. Supports exact paths and path prefixes (e.g., "/public" or "/docs").
                      </p>
                    </div>
                    <div className="space-y-2">
                      {(data.EXCLUDED_LOGIN_ROUTES || []).map((route, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={route}
                            onChange={(e) => updateExcludedLoginRoute(index, e.target.value)}
                            placeholder="/public or /docs"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeExcludedLoginRoute(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addExcludedLoginRoute}
                      >
                        Add Route
                      </Button>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">Forbidden Routes in Production</Label>
                    <p className="text-sm text-gray-500">
                      Routes that should be forbidden (redirect to /forbidden) when NODE_ENV is not "development". Supports exact paths and path prefixes (e.g., "/builder/application-variables" or "/builder").
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(data.FORBIDDEN_ROUTES_PRODUCTION || []).map((route, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={route}
                          onChange={(e) => updateForbiddenRoute(index, e.target.value)}
                          placeholder="/builder/application-variables"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeForbiddenRoute(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addForbiddenRoute}
                    >
                      Add Route
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FormTabsContent>

          {/* Logging Configuration */}
          <FormTabsContent value="logging" className="space-y-4">
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
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg"
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
                        {logType === LogType.GRAPH_LOG && 'Log graph designer operations and edge creation'}
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
          </FormTabsContent>

          {/* Authentication Configuration */}
          <FormTabsContent value="auth" className="space-y-4">
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
                      placeholder="access_token"
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
          </FormTabsContent>

          {/* UI Parameters */}
          <FormTabsContent value="ui" className="space-y-4">
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
                  <div className="space-y-4 ps-4 border-s-2 border-violet-200 dark:border-violet-800">
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
          </FormTabsContent>

          {/* Schema Configuration */}
          <FormTabsContent value="schema" className="space-y-4">
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
          </FormTabsContent>

          {/* AI Configuration */}
          <FormTabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>
                  Configure AI service endpoints and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="llm-api-url">LLM API URL</Label>
                  <Input
                    id="llm-api-url"
                    type="url"
                    value={data.AI_CONFIG?.LLM_API_URL || ''}
                    onChange={(e) => setData((prev) => ({
                      ...prev,
                      AI_CONFIG: {
                        ...prev.AI_CONFIG,
                        LLM_API_URL: e.target.value,
                      },
                    }))}
                    placeholder="https://api.openai.com/v1/chat/completions"
                  />
                  <p className="text-xs text-gray-500">
                    The API endpoint URL for LLM chat completions service (e.g., OpenAI, OpenRouter, AvalAI)
                  </p>
                </div>
              </CardContent>
            </Card>
          </FormTabsContent>
        </FormTabs>
      </div>
    </MainLayout>
  );
}

