import type { EVSimRequest, EVSimResult } from './ev-simulator.worker';

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./ev-simulator.worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return worker;
}

export function runEVSimulation(request: EVSimRequest): Promise<EVSimResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    const handler = (e: MessageEvent<EVSimResult>) => {
      w.removeEventListener('message', handler);
      w.removeEventListener('error', errorHandler);
      resolve(e.data);
    };

    const errorHandler = (err: ErrorEvent) => {
      w.removeEventListener('message', handler);
      w.removeEventListener('error', errorHandler);
      reject(err);
    };

    w.addEventListener('message', handler);
    w.addEventListener('error', errorHandler);
    w.postMessage(request);
  });
}

export function terminateEVWorker(): void {
  worker?.terminate();
  worker = null;
}
