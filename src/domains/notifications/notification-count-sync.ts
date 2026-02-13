/**
 * Notification count sync – single source for "count may have changed" events.
 *
 * Used now for: polling and refetch-on-focus (consumers refetch when notified).
 * Later: call notifyNotificationCountUpdate() from a WebSocket handler when the
 * server pushes a new notification or read state change, so the badge updates
 * in real time without polling.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Subscribe to notification count update events. When notified, consumers should
 * refetch the unread count (e.g. via NotificationService.getUnreadCount).
 * Returns an unsubscribe function.
 */
export function subscribeToNotificationCountUpdates(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all subscribers that the notification count may have changed.
 * Call this after: local mark-as-read/unread, or when a WebSocket message
 * indicates new/read notifications (future).
 */
export function notifyNotificationCountUpdate(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[notification-count-sync] Listener error:', err);
      }
    }
  });
}
