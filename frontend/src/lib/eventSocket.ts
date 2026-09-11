const RECONNECT_MS = 1000;

// Subscribes to one of the backend's JSON event websockets (world changes, display, map) and
// reconnects a second after any drop. Returns the unsubscribe function for a useEffect cleanup.
export function subscribeToEvents<T>(url: string, onEvent: (event: T) => void): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let stopped = false;

  function connect() {
    if (stopped) {
      return;
    }
    socket = new WebSocket(url);
    socket.addEventListener("message", (message) => {
      try {
        onEvent(JSON.parse(message.data) as T);
      } catch {
        // Ignore a malformed event; the next valid one carries the full state again.
      }
    });
    socket.addEventListener("close", () => {
      if (!stopped) {
        reconnectTimer = window.setTimeout(connect, RECONNECT_MS);
      }
    });
    socket.addEventListener("error", () => {
      socket?.close();
    });
  }

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
    }
    socket?.close();
  };
}
