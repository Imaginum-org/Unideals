import { useCallback, useState } from "react";

/**
 * Tracks Caps Lock while a password field has focus.
 *
 *   const { capsLock, capsLockProps } = useCapsLock();
 *   <input {...capsLockProps} />  <CapsLockHint show={capsLock} />
 *
 * Note: capsLockProps includes onBlur; spread it before any onBlur of your own.
 */
export default function useCapsLock() {
  const [capsLock, setCapsLock] = useState(false);
  const onKey = useCallback((e) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"));
  }, []);
  const onBlur = useCallback(() => setCapsLock(false), []);
  return { capsLock, capsLockProps: { onKeyDown: onKey, onKeyUp: onKey, onBlur } };
}
