import type { PermissionName, PermissionStatus, MediaDeviceType } from './types';

/**
 * Check if Permissions API is supported
 */
export const isPermissionsAPISupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'permissions' in navigator && 'query' in navigator.permissions;
};

/**
 * Check if MediaDevices API is supported
 */
export const isMediaDevicesSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
};

/**
 * Check if Geolocation API is supported
 */
export const isGeolocationSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
};

/**
 * Check if Notifications API is supported
 */
export const isNotificationsSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Query permission status using Permissions API
 */
export const queryPermission = async (name: PermissionName): Promise<PermissionState> => {
  if (!isPermissionsAPISupported()) {
    return {
      status: null,
      error: 'Permissions API is not supported in this browser',
      isSupported: false,
    };
  }

  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return {
      status: result.state as PermissionStatus,
      error: null,
      isSupported: true,
    };
  } catch (error) {
    return {
      status: null,
      error: error instanceof Error ? error.message : 'Failed to query permission',
      isSupported: false,
    };
  }
};

/**
 * Request microphone permission via getUserMedia
 */
export const requestMicrophonePermission = async (): Promise<{ granted: boolean; error: string | null }> => {
  if (!isMediaDevicesSupported()) {
    return {
      granted: false,
      error: 'MediaDevices API is not supported in this browser',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just needed to trigger the permission prompt
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, error: null };
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return { granted: false, error: 'Permission denied' };
      }
      if (error.name === 'NotFoundError') {
        return { granted: false, error: 'No microphone found' };
      }
    }
    return {
      granted: false,
      error: error instanceof Error ? error.message : 'Failed to request microphone permission',
    };
  }
};

/**
 * Request camera permission via getUserMedia
 */
export const requestCameraPermission = async (): Promise<{ granted: boolean; error: string | null }> => {
  if (!isMediaDevicesSupported()) {
    return {
      granted: false,
      error: 'MediaDevices API is not supported in this browser',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream immediately - we just needed to trigger the permission prompt
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, error: null };
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return { granted: false, error: 'Permission denied' };
      }
      if (error.name === 'NotFoundError') {
        return { granted: false, error: 'No camera found' };
      }
    }
    return {
      granted: false,
      error: error instanceof Error ? error.message : 'Failed to request camera permission',
    };
  }
};

/**
 * Request media device permission (audio, video, or both)
 */
export const requestMediaDevicePermission = async (
  type: MediaDeviceType
): Promise<{ granted: boolean; error: string | null }> => {
  if (!isMediaDevicesSupported()) {
    return {
      granted: false,
      error: 'MediaDevices API is not supported in this browser',
    };
  }

  const constraints: MediaStreamConstraints = {};
  if (type === 'audio' || type === 'audio-video') {
    constraints.audio = true;
  }
  if (type === 'video' || type === 'audio-video') {
    constraints.video = true;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Stop the stream immediately - we just needed to trigger the permission prompt
    stream.getTracks().forEach(track => track.stop());
    return { granted: true, error: null };
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return { granted: false, error: 'Permission denied' };
      }
      if (error.name === 'NotFoundError') {
        return { granted: false, error: 'Device not found' };
      }
    }
    return {
      granted: false,
      error: error instanceof Error ? error.message : 'Failed to request media device permission',
    };
  }
};

/**
 * Request geolocation permission
 */
export const requestGeolocationPermission = async (): Promise<{ granted: boolean; error: string | null }> => {
  if (!isGeolocationSupported()) {
    return {
      granted: false,
      error: 'Geolocation API is not supported in this browser',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ granted: true, error: null }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ granted: false, error: 'Permission denied' });
        } else {
          resolve({ granted: false, error: error.message });
        }
      },
      { timeout: 1000, maximumAge: 0 }
    );
  });
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<{ granted: boolean; error: string | null }> => {
  if (!isNotificationsSupported()) {
    return {
      granted: false,
      error: 'Notifications API is not supported in this browser',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      error: permission === 'denied' ? 'Permission denied' : null,
    };
  } catch (error) {
    return {
      granted: false,
      error: error instanceof Error ? error.message : 'Failed to request notification permission',
    };
  }
};

