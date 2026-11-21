import { useEffect, useState } from "react";

/** The value, held back until it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [held, setHeld] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setHeld(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return held;
}
