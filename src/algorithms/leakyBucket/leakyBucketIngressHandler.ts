import { ClientRequest } from "../example/types";
import {
  IngressHandler,
  IngressHandlerError,
  RateLimitedIngressHandler,
  RateLimiterConfig,
  RateLimitStats,
} from "../types";

interface LeakyBucketRateLimiterConfig<T> extends RateLimiterConfig<T> {
  leakyBucketCapacity: number;
}

/**
 * A RateLimitStats interface with for a leaky bucket implementation
 */
interface LeakyBucketRateLimitStats<T> extends RateLimitStats {
  // tracks a timer that will leak requests at a constant rate
  timer?: NodeJS.Timer;

  // the bucket of inbound requests
  leakyBucket: T[];

  // the capacity of the bucket, if exceeded, we drop requests to that client
  leakyBucketCapacity: number;
}

/**
 * Ip Based Leaky Bucket Rate Limited Implementation of an IngressHandler
 */
export class LeakyBucketIngressHandler<
  T extends ClientRequest
> extends RateLimitedIngressHandler<T> {
  private readonly rateLimitStats: Map<string, LeakyBucketRateLimitStats<T>> =
    new Map();

  constructor(
    private readonly config: LeakyBucketRateLimiterConfig<T>,
    forwardCallback: (req: T) => Promise<void>,
    dropCallback: (req: T, reason?: string) => Promise<void>
  ) {
    super(forwardCallback, dropCallback);
  }

  /**
   * Leak requests from a bucket based on ip.
   * @param ip the ip address of the client as gleaned from the request.
   */
  private async leakNextRequest(ip: string): Promise<void> {
    const ipStats = this.rateLimitStats.get(ip);

    if (ipStats === undefined) {
      throw new IngressHandlerError(`No Ip Stats found for client: ${ip}, the last request was likely already handled`);
    }

    // dequeue the oldest request (FIFO)
    const maybeRequest = ipStats?.leakyBucket.shift();
    if (maybeRequest) {
      return this.tryForwardingRequest(maybeRequest);
    } else {
      clearInterval(ipStats.timer);
      // remove the entry if there are no requests to process
      this.rateLimitStats.delete(ip);
    }
  }

  /**
   * Request Ingress Traffic Leaky Bucket Entry Point
   * @param req The request
   */
  public async handle(req: T): Promise<void> {
    // validate the request has an ip
    if (req.ip() === "") return this.tryDroppingRequest(req, `IP Address invalid or blank`);

    const ip = req.ip();

    // get or create the stats for this client
    let ipStats: LeakyBucketRateLimitStats<T> | undefined =
      this.rateLimitStats.get(ip);

    // first request from this client (possibly since last session was cleared)
    if (ipStats === undefined) {
      ipStats = {
        currentIngressCount: 0,
        leakyBucket: [req],
        leakyBucketCapacity: this.config.leakyBucketCapacity,
        timeFrameStartTime: Math.round(performance.now()),
        clientIp: req.ip(),
        timer: setInterval(
          () => this.leakNextRequest(ip),
          this.config.ingressTimeFrame / this.config.ingressCapacity
        ),
      } as LeakyBucketRateLimitStats<T>;

      this.rateLimitStats.set(ip, ipStats);

      // leak immediately to avoid any latency if not needed
      this.leakNextRequest(ip);
    }

    if (ipStats !== undefined) {
      if (ipStats.leakyBucket.length >= this.config.leakyBucketCapacity) {
        return this.tryDroppingRequest(req, `Requests to fast!`);
      } else {
        // enqueue
        ipStats.leakyBucket.push(req);
      }
    }
  }
}

/**
 * Builds a LeakyBucketIngressHandler using a fwd and drop handler (to fork dropped vs fwded traffic), and an optional validation schema
 * for the ingress payload.
 */
export function getLeakyBucketHandler<T extends ClientRequest>(
  leakyBucketCapacity: number,
  ingressCapacity: number,
  ingressTimeWindowMs: number,
  fwdHandler: IngressHandler<T>,
  dropHandler: IngressHandler<T>
): IngressHandler<T> {
  return new LeakyBucketIngressHandler<T>(
    {
      ingressCapacity,
      ingressTimeFrame: ingressTimeWindowMs,
      leakyBucketCapacity,
    },
    fwdHandler.handle,
    (req: T, reason?: string) => {
      console.log(`Dropping request because: ${reason}`);
      return dropHandler.handle(req)
    }
  );
}
