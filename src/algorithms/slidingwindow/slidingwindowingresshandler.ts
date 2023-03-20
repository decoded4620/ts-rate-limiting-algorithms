import { ZodType, ZodTypeDef } from "zod";
import { ClientRequest } from "../example/types";
import { IngressHandler, RateLimiterConfig, RateLimitStats } from "../types";

/**
 * Ip Based Sliding Window Rate Limited Implementation of an IngressHandler
 */
export class SlidingWindowIngressHandler<T extends ClientRequest>
  implements IngressHandler<T>
{
  private readonly rateLimitStats: Map<string, SlidingWindowRateLimitStats> =
    new Map();

  constructor(
    private readonly config: RateLimiterConfig<T>,
    private readonly forwardCallback: (req: T) => Promise<void>,
    private readonly dropCallback: (req: T) => Promise<void>
  ) {}

  /**
   * Request Ingress Traffic Sliding Window Entry Point
   * @param req The request
   */
  public async handle(req: T): Promise<void> {
    // get the request stats for the current clients ip address
    if (req.ip() === "") {
      // don't allow ip spoofing or removal
      this.dropCallback(req);
      return;
    }
    let ipStats = this.rateLimitStats.get(req.ip());

    if (!ipStats) {
      ipStats = {
        currentIngressCount: 0,
        previousCount: 0,
        windowStartTime: Math.round(performance.now()),
      };

      this.rateLimitStats.set(req.ip(), ipStats);
    }

    const nowMs = Math.round(performance.now());
    const timeDiff = nowMs - ipStats.windowStartTime;

    // update the window every 'ingressTimeWindowMs'
    if (timeDiff > this.config.ingressTimeWindowMs) {
      ipStats.previousCount = ipStats.currentIngressCount;
      ipStats.currentIngressCount = 0;
      ipStats.windowStartTime = nowMs;
    }

    // calculate ingress coming in within the sliding time window.
    const ingress = Math.floor(
      (ipStats.previousCount *
        (this.config.ingressTimeWindowMs -
          timeDiff / this.config.ingressTimeWindowMs)) /
        this.config.ingressTimeWindowMs +
        ipStats.currentIngressCount
    );

    // if we're over capacity, call the drop callback
    if (ingress > this.config.ingressCapacity) {
      try {
        await this.dropCallback(req);
      } catch (error) {
        throw new SlidingWindowIngressHandlerError("E");
      }
    } else {
      ipStats.currentIngressCount++;

      try {
        await this.forwardCallback(req);
      } catch (error) {
        throw new SlidingWindowIngressHandlerError(`E`);
      }
    }
  }
}

export class SlidingWindowIngressHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = SlidingWindowIngressHandlerError.name;
  }
}

// A RateLimitStats with previous count for a sliding window implementation
interface SlidingWindowRateLimitStats extends RateLimitStats {
  previousCount: number;
}

/**
 * Builds a SlidingWindowIngressHandler using a fwd and drop handler (to fork dropped vs fwded traffic), and an optional validation schema
 * for the ingress payload.
 *
 * @param ingressCapacity
 * @param ingressTimeWindowMs
 * @param fwdHandler
 * @param dropHandler
 * @returns
 */
export function getSlidingWindowHandler<T extends ClientRequest>(
  ingressCapacity: number,
  ingressTimeWindowMs: number,
  fwdHandler: IngressHandler<T>,
  dropHandler: IngressHandler<T>
): IngressHandler<T> {
  return new SlidingWindowIngressHandler<T>(
    {
      ingressCapacity,
      ingressTimeWindowMs,
    },
    fwdHandler.handle,
    dropHandler.handle
  );
}
