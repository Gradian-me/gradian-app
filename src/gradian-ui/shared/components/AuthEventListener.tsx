'use client';

import { useEffect } from 'react';
import { AuthEventType, handleForceLogout, subscribeToAuthEvents } from '../utils/auth-events';

export function AuthEventListener() {
  useEffect(() => {
    const unsubscribe = subscribeToAuthEvents((detail) => {
      if (detail.type === AuthEventType.FORCE_LOGOUT || detail.type === AuthEventType.SESSION_EXPIRED || detail.type === AuthEventType.REQUIRE_LOGIN) {
        handleForceLogout(detail.reason);
      }
    });
    return unsubscribe;
  }, []);

  return null;
}

