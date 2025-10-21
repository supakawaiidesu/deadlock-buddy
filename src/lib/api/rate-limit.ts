/**
 * Simple token bucket rate limiter used to ensure we stay comfortably
 * within the recommended 5 requests per second target while the upstream
 * API allows up to 100 rps. The limiter is shared across the client
 * runtime and awaits a token before executing the wrapped fetch call.
 */
class TokenBucket {
  private capacity: number;
  private tokens: number;
  private refillInterval: number;
  private queue: Array<() => void> = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillInterval = Math.floor(1000 / refillRatePerSecond);
    this.startRefill();
  }

  private startRefill() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.tokens = Math.min(this.capacity, this.tokens + 1);
      this.drain();
    }, this.refillInterval);
  }

  private drain() {
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens -= 1;
      const resolver = this.queue.shift();
      resolver?.();
    }
  }

  async consume() {
    if (this.tokens > 0) {
      this.tokens -= 1;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }
}

const limiter = new TokenBucket(5, 5);

export async function throttle<T>(fn: () => Promise<T>): Promise<T> {
  await limiter.consume();
  return fn();
}
