import { ZodType, ZodTypeDef } from "zod";
import { getErrorMessage } from "../../core/helpers";
import { ClientRequest } from "../example/types";
import { IngressHandler, RateLimiterConfig, RateLimitStats } from "../types";

/**
 * Ip Based Token Bucket Rate Limited Implementation of an IngressHandler
 */
export class LeakyBucketIngressHandler<T extends ClientRequest>
  implements IngressHandler<T>
{
  private readonly rateLimitStats: Map<string, LeakyBucketRateLimitStats<T>> =
    new Map();

  constructor(
    private readonly config: LeakyBucketRateLimiterConfig<T>,
    private readonly forwardCallback: (req: T) => Promise<void>,
    private readonly dropCallback: (req: T) => Promise<void>
  ) {}

  /**
   * Leak requests from a bucket based on ip.
   * @param ip the ip address of the client as gleaned from the request.
   */
  private async leakNextRequest(ip: string): Promise<void> {
    const ipStats = this.rateLimitStats.get(ip);

    if (ipStats === undefined) {
      throw new Error(`No Ip Stats found`);
    }

    const request = ipStats?.leakyBucket.pop();
    if (request) {
      try {
        await this.forwardCallback(request);
      } catch (error) {
        throw new LeakyBucketIngressHandlerError(
          `Error handling request forwarding ${getErrorMessage(error)}`
        );
      }
    } else {
      clearInterval(ipStats.timer);
      // remove the entry if there are no requests to process
      this.rateLimitStats.delete(ip);
    }
  }

  /**
   * Request Ingress Traffic Token Bucket Entry Point
   * @param req The request
   */
  public async handle(req: T): Promise<void> {
    // get the request stats for the current clients ip address
    if (req.ip() === "") {
      // don't allow ip spoofing or removal
      try {
        await this.dropCallback(req);
      } catch (error) {
        throw new LeakyBucketIngressHandlerError(
          `Error handling request dropping ${getErrorMessage(error)}`
        );
      }
      return;
    }
    const ip = req.ip();
    let ipStats: LeakyBucketRateLimitStats<T> | undefined =
      this.rateLimitStats.get(ip);

    if (ipStats === undefined) {
      this.rateLimitStats.set(ip, {
        currentIngressCount: 0,
        leakyBucket: [req],
        leakyBucketCapacity: this.config.leakyBucketCapacity,
        windowStartTime: Math.round(performance.now()),
        maxBucketLength: 0,
        timer: setInterval(
          () => this.leakNextRequest(ip),
          this.config.ingressTimeWindowMs / this.config.ingressCapacity
        ),
      });
    } else {
      // drop if the leaky bucket is too full
      if (ipStats.leakyBucket.length >= this.config.leakyBucketCapacity) {
        console.log(`Bucket overflow for ip ${ip}`)
        try {
          await this.dropCallback(req);
        } catch (error) {
          throw new LeakyBucketIngressHandlerError(
            `Error handling request dropping ${getErrorMessage(error)}`
          );
        }
      } else {
        ipStats.leakyBucket.push(req);
        if (ipStats.leakyBucket.length > ipStats.maxBucketLength) {
          console.log(`Max length grew ${ipStats.leakyBucket.length}`);
          ipStats.maxBucketLength = ipStats.leakyBucket.length;
        }
      }
    }
  }
}

export class LeakyBucketIngressHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = LeakyBucketIngressHandlerError.name;
  }
}

interface LeakyBucketRateLimiterConfig<T> extends RateLimiterConfig<T> {
  leakyBucketCapacity: number;
}
/**
 * A RateLimitStats interface with token count for a token bucket implementation
 */
interface LeakyBucketRateLimitStats<T> extends RateLimitStats {
  // tracks a timer that will leak requests at a constant rate
  timer?: NodeJS.Timer;

  // the maximum length that the bucket grew
  maxBucketLength: number;

  // the bucket of inbound requests
  leakyBucket: T[];

  // the capacity of the bucket, if exceeded, we drop requests to that client
  leakyBucketCapacity: number;
}

/**
 * Builds a TokenBucketIngressHandler using a fwd and drop handler (to fork dropped vs fwded traffic), and an optional validation schema
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
      ingressTimeWindowMs,
      leakyBucketCapacity,
    },
    fwdHandler.handle,
    dropHandler.handle
  );
}
