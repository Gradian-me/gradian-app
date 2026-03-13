type NotificationKind = 'success' | 'warning' | 'error';
type ImpactKind = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

export type AndroidHapticsKey =
  | 'Clock_Tick'
  | 'Confirm'
  | 'Context_Click'
  | 'Drag_Start'
  | 'Gesture_End'
  | 'Gesture_Start'
  | 'Keyboard_Press'
  | 'Keyboard_Release'
  | 'Keyboard_Tap'
  | 'Long_Press'
  | 'No_Haptics'
  | 'Reject'
  | 'Segment_Frequent_Tick'
  | 'Segment_Tick'
  | 'Text_Handle_Move'
  | 'Toggle_Off'
  | 'Toggle_On'
  | 'Virtual_Key'
  | 'Virtual_Key_Release';

function hasVibrationSupport(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & {
    vibrate?: (p: number | number[]) => boolean;
    maxTouchPoints?: number;
  };
  if (!nav.vibrate) return false;
  // Heuristic: require at least one touch point to consider haptics meaningful.
  // On many desktop browsers, vibrate is a no-op even if present.
  const touchPoints = typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0;
  return touchPoints > 0;
}

function vibrate(pattern: number | number[]): boolean {
  if (!hasVibrationSupport()) return false;
  const nav = window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try {
    nav.vibrate?.(pattern);
    return true;
  } catch {
    // Ignore vibration errors to avoid breaking UX
    return false;
  }
}

export function triggerSelection(): boolean {
  // Short, light tick
  return vibrate(15);
}

export function triggerNotification(kind: NotificationKind = 'success'): boolean {
  let ok = false;
  switch (kind) {
    case 'success':
      // Two short pulses
      ok = vibrate([20, 40, 20]);
      break;
    case 'warning':
      // Medium pulse, short pause, short pulse
      ok = vibrate([40, 60, 25]);
      break;
    case 'error':
      // Three stronger pulses
      ok = vibrate([60, 40, 60, 40, 60]);
      break;
  }
  return ok;
}

export function triggerImpact(kind: ImpactKind = 'medium'): boolean {
  let ok = false;
  switch (kind) {
    case 'light':
      ok = vibrate(20);
      break;
    case 'medium':
      ok = vibrate(35);
      break;
    case 'heavy':
      ok = vibrate(55);
      break;
    case 'rigid':
      ok = vibrate([30, 10, 30]);
      break;
    case 'soft':
      ok = vibrate([10, 20, 10]);
      break;
  }
  return ok;
}

export function triggerAndroid(type: AndroidHapticsKey): boolean {
  // Best-effort mapping for web; many devices will just approximate
  let ok = false;
  switch (type) {
    case 'Confirm':
    case 'Toggle_On':
      ok = vibrate([25, 30, 25]);
      break;
    case 'Reject':
    case 'Toggle_Off':
      ok = vibrate([50, 30, 50]);
      break;
    case 'Long_Press':
      ok = vibrate(70);
      break;
    case 'Clock_Tick':
    case 'Keyboard_Tap':
    case 'Keyboard_Press':
    case 'Keyboard_Release':
    case 'Virtual_Key':
    case 'Virtual_Key_Release':
      ok = vibrate(15);
      break;
    case 'Segment_Tick':
    case 'Segment_Frequent_Tick':
      ok = vibrate([10, 30, 10]);
      break;
    case 'Context_Click':
    case 'Drag_Start':
    case 'Gesture_Start':
    case 'Gesture_End':
    case 'Text_Handle_Move':
      ok = vibrate(30);
      break;
    case 'No_Haptics':
    default:
      break;
  }
  return ok;
}

