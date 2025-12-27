# Permissions Components

Basic and pure utilities for handling browser permissions.

## Features

- Check permission status using Permissions API
- Request various browser permissions
- React hooks for easy integration
- Type-safe with TypeScript
- No external dependencies

## Usage

### Check Permission Status

```tsx
import { usePermission } from '@/components/ui/permissions';

function MyComponent() {
  const { status, isLoading, check } = usePermission('microphone');
  
  if (isLoading) return <div>Checking...</div>;
  
  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={check}>Refresh</button>
    </div>
  );
}
```

### Request Media Permissions

```tsx
import { useMediaPermission } from '@/components/ui/permissions';

function MyComponent() {
  const { requestMicrophone, isRequesting, error } = useMediaPermission();
  
  const handleRequest = async () => {
    const granted = await requestMicrophone();
    if (granted) {
      console.log('Microphone permission granted!');
    }
  };
  
  return (
    <button onClick={handleRequest} disabled={isRequesting}>
      {isRequesting ? 'Requesting...' : 'Request Microphone'}
    </button>
  );
}
```

### Request Notification Permission

```tsx
import { useNotificationPermission } from '@/components/ui/permissions';

function MyComponent() {
  const { status, request, isRequesting } = useNotificationPermission();
  
  return (
    <button onClick={request} disabled={isRequesting || status === 'granted'}>
      {status === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
    </button>
  );
}
```

### Direct Utility Functions

```tsx
import { queryPermission, requestMicrophonePermission } from '@/components/ui/permissions';

// Check permission
const result = await queryPermission('camera');
console.log(result.status); // 'granted' | 'denied' | 'prompt'

// Request permission
const { granted, error } = await requestMicrophonePermission();
if (granted) {
  console.log('Permission granted!');
}
```

## Available Permissions

- `camera` - Camera access
- `microphone` - Microphone access
- `geolocation` - Location access
- `notifications` - Browser notifications
- `persistent-storage` - Persistent storage
- `push` - Push notifications
- `midi` - MIDI access
- `clipboard-read` - Clipboard read
- `clipboard-write` - Clipboard write
- And more...

## Hooks

- `usePermission(name)` - Check any permission status
- `useMediaPermission()` - Request media device permissions
- `useNotificationPermission()` - Request notification permission
- `useGeolocationPermission()` - Request geolocation permission

