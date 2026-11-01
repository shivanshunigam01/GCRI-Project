type Listener = (pendingCount: number) => void;

let pendingCount = 0;
const listeners = new Set<Listener>();

export function getApiPendingCount(): number {
  return pendingCount;
}

export function subscribeApiLoading(listener: Listener): () => void {
  listeners.add(listener);
  listener(pendingCount);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener(pendingCount));
}

export function beginApiRequest(): void {
  pendingCount += 1;
  notify();
}

export function endApiRequest(): void {
  pendingCount = Math.max(0, pendingCount - 1);
  notify();
}
