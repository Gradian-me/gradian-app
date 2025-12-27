// Types
export type {
  PermissionName,
  PermissionStatus,
  PermissionState,
  MediaDeviceType,
} from './types';

// Utils
export {
  isPermissionsAPISupported,
  isMediaDevicesSupported,
  isGeolocationSupported,
  isNotificationsSupported,
  queryPermission,
  requestMicrophonePermission,
  requestCameraPermission,
  requestMediaDevicePermission,
  requestGeolocationPermission,
  requestNotificationPermission,
} from './utils';

// Hooks
export {
  usePermission,
  type UsePermissionReturn,
} from './hooks/usePermission';

export {
  useMediaPermission,
  type UseMediaPermissionReturn,
} from './hooks/useMediaPermission';

export {
  useNotificationPermission,
  type NotificationPermissionStatus,
  type UseNotificationPermissionReturn,
} from './hooks/useNotificationPermission';

export {
  useGeolocationPermission,
  type UseGeolocationPermissionReturn,
} from './hooks/useGeolocationPermission';

// Components
export { PermissionStatusBadge } from './PermissionStatus';

