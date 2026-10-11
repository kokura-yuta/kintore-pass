// Shares only unfinished requests. Never persists data or caches failures.
export function createRequestGate() {
  let generation = 0;
  let flight: Promise<void> | null = null;
  return {
    run<T>(load: () => Promise<T>, accept: (value: T) => void, reject: (error: unknown) => void) {
      if (flight) return flight;
      const version = generation;
      const task = Promise.resolve().then(load).then(
        value => { if (version === generation) accept(value); },
        error => { if (version === generation) reject(error); },
      ).finally(() => { if (flight === task) flight = null; });
      flight = task;
      return task;
    },
    invalidate() { generation += 1; flight = null; },
  };
}
