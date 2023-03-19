/**
 * Interface for handling ingress traffic
 */
export interface IngressHandler<T> {
  /**
   * Handles an Ingress Request (HTTP Request as an example)
   *
   * @param req Type T Request
   * @param forwardCallback An async function to handle a successful request. This should delegate to the request business logic.
   * @param dropCallback An async function to handle a dropped request. This could be used to queue and retry the requset
   */
  handle(req: T): Promise<void>;
}

/**
 * Configuration interface for rate limiting ingress traffic
 */
export interface RateLimiterConfig<T> {
  /**
   * The time window for measuring capacity in milliseconds
   */
  ingressTimeWindowMs: number;

  /**
   * Max requests for the window
   */
  ingressCapacity: number;
}

/**
 * Interface for Rate Limiting Stats tracking within an integress handler.
 */
export interface RateLimitStats {
  currentIngressCount: number;
  windowStartTime: number;
}
