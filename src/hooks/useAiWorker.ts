import { useCallback, useEffect, useRef } from 'react';

import type { AiRequest, AiResponse } from '@/ai/types';

type PendingResolve = (response: AiResponse) => void;
type PendingReject = (error: Error) => void;

interface PendingRequest {
  resolve: PendingResolve;
  reject: PendingReject;
}

/**
 * React hook that manages an AI Web Worker lifecycle.
 * The worker is created lazily on first use and cleaned up on unmount.
 * Only one request can be in-flight at a time — submitting a new request
 * while one is pending will reject the previous one.
 */
export function useAiWorker(): {
  requestAiMove: (req: AiRequest) => Promise<AiResponse>;
} {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);

  useEffect(() => {
    return (): void => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (pendingRef.current) {
        pendingRef.current.reject(new Error('AI worker unmounted'));
        pendingRef.current = null;
      }
    };
  }, []);

  const requestAiMove = useCallback((req: AiRequest): Promise<AiResponse> => {
    // Reject any pending request before issuing a new one
    if (pendingRef.current) {
      pendingRef.current.reject(new Error('AI request superseded by a newer request'));
      pendingRef.current = null;
    }

    // Create the worker lazily on first use
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('@/ai/ai.worker.ts', import.meta.url), { type: 'module' });
    }

    const worker = workerRef.current;

    return new Promise<AiResponse>((resolve, reject) => {
      pendingRef.current = { resolve, reject };

      const handleMessage = (e: MessageEvent<AiResponse>): void => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        pendingRef.current = null;
        resolve(e.data);
      };

      const handleError = (e: ErrorEvent): void => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        pendingRef.current = null;
        reject(new Error(`AI worker error: ${e.message}`));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage(req);
    });
  }, []);

  return { requestAiMove };
}
