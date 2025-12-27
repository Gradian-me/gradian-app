/**
 * Supported browser permission names
 */
export type PermissionName =
  | 'camera'
  | 'microphone'
  | 'geolocation'
  | 'notifications'
  | 'persistent-storage'
  | 'push'
  | 'midi'
  | 'clipboard-read'
  | 'clipboard-write'
  | 'payment-handler'
  | 'accelerometer'
  | 'gyroscope'
  | 'magnetometer'
  | 'ambient-light-sensor'
  | 'background-sync'
  | 'bluetooth'
  | 'nfc'
  | 'speaker-selection';

/**
 * Permission status states
 */
export type PermissionStatus = 'granted' | 'denied' | 'prompt';

/**
 * Permission query result
 */
export interface PermissionState {
  status: PermissionStatus | null;
  error: string | null;
  isSupported: boolean;
}

/**
 * Media device permission types
 */
export type MediaDeviceType = 'audio' | 'video' | 'audio-video';

