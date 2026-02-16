'use client';

import React, { useState } from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  usePermission,
  useMediaPermission,
  useNotificationPermission,
  useGeolocationPermission,
  PermissionStatusBadge,
  type PermissionName,
} from '@/components/permissions';
import {
  Mic,
  Video,
  MapPin,
  Bell,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function PermissionsTestPage() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  // Individual loading states for each permission request
  const [isRequestingMicrophone, setIsRequestingMicrophone] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [isRequestingAudioVideo, setIsRequestingAudioVideo] = useState(false);
  // Force refresh key for PermissionStatusBadge components
  const [refreshKey, setRefreshKey] = useState(0);

  // Media permissions - using individual states instead of shared isRequesting
  const {
    requestMicrophone,
    requestCamera,
    requestMediaDevice,
    error: mediaError,
  } = useMediaPermission();

  // Notification permission
  const {
    status: notificationStatus,
    request: requestNotification,
    isRequesting: isRequestingNotification,
    isSupported: isNotificationSupported,
  } = useNotificationPermission();

  // Geolocation permission
  const {
    request: requestGeolocation,
    isRequesting: isRequestingGeolocation,
    isSupported: isGeolocationSupported,
    error: geolocationError,
  } = useGeolocationPermission();

  // Common permissions to test
  const commonPermissions: PermissionName[] = [
    'camera',
    'microphone',
    'geolocation',
    'notifications',
    'persistent-storage',
    'clipboard-read',
    'clipboard-write',
  ];

  const handleTestPermission = async (name: PermissionName) => {
    setTestResults((prev) => ({ ...prev, [name]: { testing: true } }));
    try {
      // This will be handled by the PermissionStatusBadge component
      setTestResults((prev) => ({ ...prev, [name]: { testing: false, success: true } }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [name]: { testing: false, success: false, error: String(error) },
      }));
    }
  };

  const handleRequestMicrophone = async () => {
    setIsRequestingMicrophone(true);
    try {
      const granted = await requestMicrophone();
      setTestResults((prev) => ({
        ...prev,
        microphone: { granted, timestamp: new Date().toISOString() },
      }));
      // Refresh permission status after a short delay to allow browser to update
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 500);
    } finally {
      setIsRequestingMicrophone(false);
    }
  };

  const handleRequestCamera = async () => {
    setIsRequestingCamera(true);
    try {
      const granted = await requestCamera();
      setTestResults((prev) => ({
        ...prev,
        camera: { granted, timestamp: new Date().toISOString() },
      }));
      // Refresh permission status after a short delay to allow browser to update
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 500);
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const handleRequestAudioVideo = async () => {
    setIsRequestingAudioVideo(true);
    try {
      const granted = await requestMediaDevice('audio-video');
      setTestResults((prev) => ({
        ...prev,
        'audio-video': { granted, timestamp: new Date().toISOString() },
      }));
      // Refresh permission status after a short delay to allow browser to update
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 500);
    } finally {
      setIsRequestingAudioVideo(false);
    }
  };

  const handleRequestNotification = async () => {
    const granted = await requestNotification();
    setTestResults((prev) => ({
      ...prev,
      notifications: { granted, timestamp: new Date().toISOString() },
    }));
  };

  const handleRequestGeolocation = async () => {
    const granted = await requestGeolocation();
    setTestResults((prev) => ({
      ...prev,
      geolocation: { granted, timestamp: new Date().toISOString() },
    }));
  };

  const testMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Mic access granted");
      stream.getTracks().forEach(t => t.stop());
      setTestResults((prev) => ({
        ...prev,
        microphone: { granted: true, timestamp: new Date().toISOString(), test: true },
      }));
      // Refresh permission status
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 500);
    } catch (err) {
      console.error(err instanceof Error ? err.name : 'Error', err instanceof Error ? err.message : String(err));
      setTestResults((prev) => ({
        ...prev,
        microphone: { granted: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err), test: true },
      }));
    }
  };

  useSetLayoutProps({
    title: 'Permissions Test',
    subtitle: 'Test all browser permissions and APIs',
    icon: 'Shield',
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
        {/* API Support Check */}
        <Card>
          <CardHeader>
            <CardTitle>API Support</CardTitle>
            <CardDescription>Check which permission APIs are supported in this browser</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Permissions API</span>
                <Badge variant={typeof navigator !== 'undefined' && 'permissions' in navigator ? 'default' : 'secondary'}>
                  {typeof navigator !== 'undefined' && 'permissions' in navigator ? 'Supported' : 'Not Supported'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">MediaDevices API</span>
                <Badge variant={typeof navigator !== 'undefined' && 'mediaDevices' in navigator ? 'default' : 'secondary'}>
                  {typeof navigator !== 'undefined' && 'mediaDevices' in navigator ? 'Supported' : 'Not Supported'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Geolocation API</span>
                <Badge variant={isGeolocationSupported ? 'default' : 'secondary'}>
                  {isGeolocationSupported ? 'Supported' : 'Not Supported'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Notifications API</span>
                <Badge variant={isNotificationSupported ? 'default' : 'secondary'}>
                  {isNotificationSupported ? 'Supported' : 'Not Supported'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Media Device Permissions
            </CardTitle>
            <CardDescription>Request access to microphone and camera</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  <span className="font-medium">Microphone</span>
                </div>
                <PermissionStatusBadge key={`microphone-${refreshKey}`} name="microphone" />
                <Button
                  onClick={handleRequestMicrophone}
                  disabled={isRequestingMicrophone}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  {isRequestingMicrophone ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Request Permission
                    </>
                  )}
                </Button>
                {testResults.microphone && (
                  <div className="text-xs text-muted-foreground">
                    {testResults.microphone.granted ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Denied
                      </span>
                    )}
                  </div>
                )}
                {mediaError && (
                  <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {mediaError}
                  </div>
                )}
                <Button
                  onClick={testMic}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                >
                  Test Mic (Direct)
                </Button>
                {testResults.microphone?.test && (
                  <div className="text-xs text-muted-foreground">
                    {testResults.microphone.granted ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Direct test: Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Direct test: {testResults.microphone.error || 'Denied'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <span className="font-medium">Camera</span>
                </div>
                <PermissionStatusBadge key={`camera-${refreshKey}`} name="camera" />
                <Button
                  onClick={handleRequestCamera}
                  disabled={isRequestingCamera}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  {isRequestingCamera ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Request Permission
                    </>
                  )}
                </Button>
                {testResults.camera && (
                  <div className="text-xs text-muted-foreground">
                    {testResults.camera.granted ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Denied
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <Mic className="h-4 w-4" />
                  <span className="font-medium">Audio + Video</span>
                </div>
                <div className="flex items-center gap-2">
                  <PermissionStatusBadge key={`microphone-av-${refreshKey}`} name="microphone" />
                  <PermissionStatusBadge key={`camera-av-${refreshKey}`} name="camera" />
                </div>
                <Button
                  onClick={handleRequestAudioVideo}
                  disabled={isRequestingAudioVideo}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  {isRequestingAudioVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Request Both
                    </>
                  )}
                </Button>
                {testResults['audio-video'] && (
                  <div className="text-xs text-muted-foreground">
                    {testResults['audio-video'].granted ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Denied
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Permission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Permission
            </CardTitle>
            <CardDescription>Request permission to show browser notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="font-medium">Notifications</span>
                </div>
                <Badge
                  variant={
                    notificationStatus === 'granted'
                      ? 'default'
                      : notificationStatus === 'denied'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {notificationStatus || 'unknown'}
                </Badge>
              </div>
              <Button
                onClick={handleRequestNotification}
                disabled={isRequestingNotification || notificationStatus === 'granted'}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {isRequestingNotification ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : notificationStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Already Granted
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Request Permission
                  </>
                )}
              </Button>
              {testResults.notifications && (
                <div className="text-xs text-muted-foreground">
                  {testResults.notifications.granted ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Granted at {new Date(testResults.notifications.timestamp).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="h-3 w-3" />
                      Denied
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Geolocation Permission */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geolocation Permission
            </CardTitle>
            <CardDescription>Request permission to access device location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Geolocation</span>
                </div>
                <PermissionStatusBadge key={`geolocation-${refreshKey}`} name="geolocation" />
              </div>
              <Button
                onClick={handleRequestGeolocation}
                disabled={isRequestingGeolocation || !isGeolocationSupported}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {isRequestingGeolocation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : !isGeolocationSupported ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Not Supported
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Request Permission
                  </>
                )}
              </Button>
              {geolocationError && (
                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {geolocationError}
                </div>
              )}
              {testResults.geolocation && (
                <div className="text-xs text-muted-foreground">
                  {testResults.geolocation.granted ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Granted at {new Date(testResults.geolocation.timestamp).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="h-3 w-3" />
                      Denied
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Permissions Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              All Permissions Status
            </CardTitle>
            <CardDescription>Check status of all available permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commonPermissions.map((permission) => (
                <div key={permission} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{permission.replace('-', ' ')}</span>
                    <Button
                      onClick={() => handleTestPermission(permission)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  <PermissionStatusBadge name={permission} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Click "Request Permission" buttons to trigger browser permission prompts</p>
            <p>• Use the refresh button next to each permission to check current status</p>
            <p>• Green badges indicate granted permissions, red indicates denied</p>
            <p>• Some permissions may require user interaction (click) to request</p>
            <p>• Browser settings can override permission states</p>
          </CardContent>
        </Card>
      </div>
  );
}

