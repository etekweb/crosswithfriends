/**
 * Mock implementations for Socket.IO
 */

export interface MockSocket {
  connected: boolean;
  id: string;
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  disconnect: () => void;
  connect: () => void;
  _callbacks: Record<string, Array<(...args: any[]) => void>>;
}

export function createMockSocket(): MockSocket {
  const callbacks: Record<string, Array<(...args: any[]) => void>> = {};

  const socket: MockSocket = {
    connected: true,
    id: 'mock-socket-id',
    emit: (event: string, ...args: any[]) => {
      // In a real test, you might want to track emitted events
      console.log(`[MockSocket] emit: ${event}`, args);
    },
    on: (event: string, callback: (...args: any[]) => void) => {
      if (!callbacks[event]) {
        callbacks[event] = [];
      }
      callbacks[event].push(callback);
    },
    off: (event: string, callback?: (...args: any[]) => void) => {
      if (callbacks[event]) {
        if (callback) {
          callbacks[event] = callbacks[event].filter((cb) => cb !== callback);
        } else {
          delete callbacks[event];
        }
      }
    },
    disconnect: () => {
      socket.connected = false;
    },
    connect: () => {
      socket.connected = true;
      // Trigger connect event
      if (callbacks.connect) {
        callbacks.connect.forEach((cb) => cb());
      }
    },
    _callbacks: callbacks,
  };

  return socket;
}

/**
 * Helper to trigger a socket event in tests
 */
export function triggerSocketEvent(socket: MockSocket, event: string, ...args: any[]) {
  if (socket._callbacks[event]) {
    socket._callbacks[event].forEach((callback) => callback(...args));
  }
}
