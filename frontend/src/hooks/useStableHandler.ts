import { useCallback, useLayoutEffect, useRef } from "react";

// A function whose identity never changes but which always calls the latest `handler`.
// App re-creates its handlers on every render, so passing them straight down defeats
// React.memo and any effect keyed on them; this is the one place that bridges the two.
// Call the result from event handlers, not during render.
export function useStableHandler<Args extends unknown[], Result>(
  handler: (...args: Args) => Result
): (...args: Args) => Result {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  return useCallback((...args: Args) => latest.current(...args), []);
}
