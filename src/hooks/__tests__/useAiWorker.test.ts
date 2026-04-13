import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiRequest, AiResponse } from '@/ai/types';
import { useAiWorker } from '@/hooks/useAiWorker';

// ── Mock Worker ─────────────────────────────────────────────────────────────
type ListenerMap = Record<string, ((e: unknown) => void)[]>;

class MockWorker {
  listeners: ListenerMap = {};
  lastPostedMessage: unknown = null;
  terminated = false;

  postMessage(msg: unknown): void {
    this.lastPostedMessage = msg;
  }

  addEventListener(type: string, handler: (e: unknown) => void): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(handler);
  }

  removeEventListener(type: string, handler: (e: unknown) => void): void {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((h) => h !== handler);
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  // Test helper: simulate a message from the worker
  simulateMessage(data: AiResponse): void {
    const handlers = [...(this.listeners['message'] ?? [])];
    for (const h of handlers) {
      h({ data } as MessageEvent);
    }
  }

  // Test helper: simulate an error from the worker
  simulateError(message: string): void {
    const handlers = [...(this.listeners['error'] ?? [])];
    for (const h of handlers) {
      h({ message } as ErrorEvent);
    }
  }
}

// Keep track of created workers for assertions
let createdWorkers: MockWorker[] = [];

beforeEach(() => {
  createdWorkers = [];
  vi.stubGlobal(
    'Worker',
    class extends MockWorker {
      constructor() {
        super();
        createdWorkers.push(this);
      }
    },
  );
});

afterEach(() => {
  // Ensure hooks are cleaned up before we tear down globals
  cleanup();
  vi.restoreAllMocks();
});

const dummyRequest: AiRequest = {
  board: {
    points: Array.from({ length: 24 }, () => ({ player: null, count: 0 })),
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
  },
  player: 'black',
  dice: [3, 1],
  difficulty: 'medium',
};

describe('useAiWorker', () => {
  it('should create worker lazily on first requestAiMove call', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());

    expect(createdWorkers).toHaveLength(0);

    let promise: Promise<AiResponse>;
    act(() => {
      promise = result.current.requestAiMove(dummyRequest);
    });

    expect(createdWorkers).toHaveLength(1);

    // Resolve the pending request before unmount to avoid unhandled rejection
    act(() => {
      createdWorkers[0].simulateMessage({ moves: [] });
    });
    await promise!;
    unmount();
  });

  it('should reuse the same worker for subsequent calls', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());

    let promise1: Promise<AiResponse>;
    act(() => {
      promise1 = result.current.requestAiMove(dummyRequest);
    });

    // Resolve first request
    act(() => {
      createdWorkers[0].simulateMessage({ moves: [] });
    });

    await promise1!;

    let promise2: Promise<AiResponse>;
    act(() => {
      promise2 = result.current.requestAiMove(dummyRequest);
    });

    expect(createdWorkers).toHaveLength(1);

    // Resolve second request before unmount
    act(() => {
      createdWorkers[0].simulateMessage({ moves: [] });
    });
    await promise2!;
    unmount();
  });

  it('should resolve promise when worker posts a message', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());
    const expectedResponse: AiResponse = {
      moves: [{ from: 5, to: 3, dieUsed: 2 }],
    };

    let promise: Promise<AiResponse>;
    act(() => {
      promise = result.current.requestAiMove(dummyRequest);
    });

    act(() => {
      createdWorkers[0].simulateMessage(expectedResponse);
    });

    const response = await promise!;
    expect(response).toEqual(expectedResponse);
    unmount();
  });

  it('should reject promise on worker error event', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());

    let promise: Promise<AiResponse>;
    act(() => {
      promise = result.current.requestAiMove(dummyRequest);
    });

    act(() => {
      createdWorkers[0].simulateError('something went wrong');
    });

    await expect(promise!).rejects.toThrow('AI worker error: something went wrong');
    unmount();
  });

  it('should reject prior pending request when a new one is submitted', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());

    let promise1: Promise<AiResponse>;
    let promise2: Promise<AiResponse>;

    act(() => {
      promise1 = result.current.requestAiMove(dummyRequest);
    });

    act(() => {
      promise2 = result.current.requestAiMove(dummyRequest);
    });

    // First promise should be rejected with superseded message
    await expect(promise1!).rejects.toThrow('superseded');

    // Second promise should still be resolvable
    act(() => {
      createdWorkers[0].simulateMessage({ moves: [] });
    });

    const response = await promise2!;
    expect(response).toEqual({ moves: [] });
    unmount();
  });

  it('should terminate worker and reject pending promise on unmount', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());

    let promise: Promise<AiResponse>;
    act(() => {
      promise = result.current.requestAiMove(dummyRequest);
    });

    const worker = createdWorkers[0];
    expect(worker.terminated).toBe(false);

    unmount();

    expect(worker.terminated).toBe(true);
    await expect(promise!).rejects.toThrow('unmounted');
  });

  it('should post the request to the worker', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());

    let promise: Promise<AiResponse>;
    act(() => {
      promise = result.current.requestAiMove(dummyRequest);
    });

    expect(createdWorkers[0].lastPostedMessage).toEqual(dummyRequest);

    // Resolve before unmount
    act(() => {
      createdWorkers[0].simulateMessage({ moves: [] });
    });
    await promise!;
    unmount();
  });

  it('should clean up event listeners after message resolution', async () => {
    const { result, unmount } = renderHook(() => useAiWorker());

    let promise: Promise<AiResponse>;
    act(() => {
      promise = result.current.requestAiMove(dummyRequest);
    });

    const worker = createdWorkers[0];
    expect(worker.listeners['message']?.length).toBe(1);
    expect(worker.listeners['error']?.length).toBe(1);

    act(() => {
      worker.simulateMessage({ moves: [] });
    });

    await promise!;

    // Listeners should have been removed
    expect(worker.listeners['message']?.length).toBe(0);
    expect(worker.listeners['error']?.length).toBe(0);
    unmount();
  });
});
