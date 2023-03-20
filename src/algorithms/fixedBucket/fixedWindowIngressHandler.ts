import { ClientRequest } from "../example/types";
import {
  IngressHandler,
  RateLimitedIngressHandler,
  RateLimiterConfig,
  RateLimitStats,
} from "../types";

/**
 * Ip Based Fixed Window Rate Limited Implementation of an IngressHandler
 */
export class FixedWindowIngressHandler<
  T extends ClientRequest
> extends RateLimitedIngressHandler<T> {
  private readonly rateLimitStats: Map<string, RateLimitStats> = new Map();

  constructor(
    private readonly config: RateLimiterConfig<T>,
    forwardCallback: (req: T) => Promise<void>,
    dropCallback: (req: T, reason?: string) => Promise<void>
  ) {
    super(forwardCallback, dropCallback);
  }

  /**
   * Request Ingress Traffic Fixed Window Entry Point
   * @param req The request
   */
  public async handle(req: T): Promise<void> {
    // get the request stats for the current clients ip address
    // don't allow ip spoofing or removal
    if (req.ip() === "") return this.tryDroppingRequest(req, `IP Address was blank or invalid`);

    let ipStats = this.rateLimitStats.get(req.ip());

    if (ipStats === undefined) {
      ipStats = {
        clientIp: req.ip(),
        currentIngressCount: 0,
        timeFrameStartTime: Math.round(performance.now()),
      };

      this.rateLimitStats.set(req.ip(), ipStats);
    }

    const nowMs = Math.round(performance.now());
    const timeDiff = nowMs - ipStats.timeFrameStartTime;

    // update the window every 'ingressTimeWindowMs'
    if (timeDiff > this.config.ingressTimeFrame) {
      ipStats.currentIngressCount = 0;
      ipStats.timeFrameStartTime = nowMs;
    }

    // if we're over capacity, call the drop callback
    if (ipStats.currentIngressCount > this.config.ingressCapacity) {
      this.tryDroppingRequest(req, `Requests too fast!`);
    } else {
      this.tryForwardingRequest(req);
      ipStats.currentIngressCount++;
    }
  }
}

/**
 * Builds a FixedWindowIngressHandler using a fwd and drop handler (to fork dropped vs fwded traffic), and an optional validation schema
 * for the ingress payload.
 *
 * @param ingressCapacity
 * @param ingressTimeWindowMs
 * @param fwdHandler
 * @param dropHandler
 * @returns
 */
export function getFixedWindowHandler<T extends ClientRequest>(
  ingressCapacity: number,
  ingressTimeWindowMs: number,
  fwdHandler: IngressHandler<T>,
  dropHandler: IngressHandler<T>
): IngressHandler<T> {
  return new FixedWindowIngressHandler<T>(
    {
      ingressCapacity,
      ingressTimeFrame: ingressTimeWindowMs,
    },
    fwdHandler.handle,
    (req: T, reason?: string) => {
      console.log(`Dropping request because: ${reason}`);
      return dropHandler.handle(req)
    }
  );
}
