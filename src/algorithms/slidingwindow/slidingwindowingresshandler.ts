import { ClientRequest } from "../example/types";
import {
  IngressHandler,
  RateLimitedIngressHandler,
  RateLimiterConfig,
  RateLimitStats,
} from "../types";

/**
 * Ip Based Sliding Window Rate Limited Implementation of an IngressHandler
 */
export class SlidingWindowIngressHandler<
  T extends ClientRequest
> extends RateLimitedIngressHandler<T> {
  private readonly rateLimitStats: Map<string, SlidingWindowRateLimitStats> =
    new Map();

  constructor(
    private readonly config: RateLimiterConfig<T>,
    forwardCallback: (req: T) => Promise<void>,
    dropCallback: (req: T, reason?: string) => Promise<void>
  ) {
    super(forwardCallback, dropCallback);
  }

  /**
   * Request Ingress Traffic Sliding Window Entry Point
   * @param req The request
   */
  public async handle(req: T): Promise<void> {
    // get the request stats for the current clients ip address
    if (req.ip() === "") return this.tryDroppingRequest(req, `IP Address was blank or invalid`);

    let ipStats: SlidingWindowRateLimitStats | undefined =
      this.rateLimitStats.get(req.ip());

    if (ipStats === undefined) {
      ipStats = {
        clientIp: req.ip(),
        currentIngressCount: 0,
        previousCount: 0,
        timeFrameStartTime: Math.round(performance.now()),
      };

      this.rateLimitStats.set(req.ip(), ipStats);
    }

    if (ipStats !== undefined) {
      const nowMs = Math.round(performance.now());
      const timeDiff = nowMs - ipStats.timeFrameStartTime;

      // update the window every 'ingressTimeWindowMs'
      if (timeDiff > this.config.ingressTimeFrame) {
        ipStats.previousCount = ipStats.currentIngressCount;
        ipStats.currentIngressCount = 0;
        ipStats.timeFrameStartTime = nowMs;
      }

      // calculate ingress coming in within the sliding time window.
      const ingress = Math.floor(
        (ipStats.previousCount *
          (this.config.ingressTimeFrame -
            timeDiff / this.config.ingressTimeFrame)) /
          this.config.ingressTimeFrame +
          ipStats.currentIngressCount
      );

      // if we're over capacity, call the drop callback
      if (ingress > this.config.ingressCapacity) {
        return this.tryDroppingRequest(req, `Requests too fast`);
      } else {
        await this.tryForwardingRequest(req);
        ipStats.currentIngressCount++;
      }
    }
  }
}

// A RateLimitStats with previous count for a sliding window implementation
interface SlidingWindowRateLimitStats extends RateLimitStats {
  previousCount: number;
}

/**
 * Builds a SlidingWindowIngressHandler using a fwd and drop handler (to fork dropped vs fwded traffic), and an optional validation schema
 * for the ingress payload.
 */
export function getSlidingWindowHandler<T extends ClientRequest>(
  ingressCapacity: number,
  ingressTimeFrame: number,
  fwdHandler: IngressHandler<T>,
  dropHandler: IngressHandler<T>
): IngressHandler<T> {
  return new SlidingWindowIngressHandler<T>(
    {
      ingressCapacity,
      ingressTimeFrame: ingressTimeFrame,
    },
    fwdHandler.handle,
    (req: T, reason?: string) => {
      console.log(`Dropping request because: ${reason}`);
      return dropHandler.handle(req)
    }
  );
}
