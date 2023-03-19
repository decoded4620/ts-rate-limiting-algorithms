import { ZodType, ZodTypeDef } from "zod";
import { ClientRequest } from "../example/types";
import { IngressHandler, RateLimiterConfig, RateLimitStats } from "../types";

/**
 * Ip Based Token Bucket Rate Limited Implementation of an IngressHandler
 */
export class TokenBucketIngressHandler<T extends ClientRequest>
  implements IngressHandler<T>
{
  private readonly rateLimitStats: Map<string, TokenBucketRateLimitStats> =
    new Map();

  constructor(
    private readonly config: RateLimiterConfig<T>,
    private readonly forwardCallback: (req: T) => Promise<void>,
    private readonly dropCallback: (req: T) => Promise<void>
  ) {}

  /**
   * Request Ingress Traffic Token Bucket Entry Point
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
        tokenBucketCount: this.config.ingressCapacity,
        windowStartTime: Math.round(performance.now()),
      };

      this.rateLimitStats.set(req.ip(), ipStats);
    }

    const nowMs = Math.round(performance.now());
    const timeDiff = nowMs - ipStats.windowStartTime;

    // update the window every 'ingressTimeWindowMs'
    if (timeDiff > this.config.ingressTimeWindowMs) {
      ipStats.currentIngressCount = 0;
      ipStats.tokenBucketCount = this.config.ingressCapacity;
      ipStats.windowStartTime = nowMs;
    }

    // if we're over capacity, call the drop callback
    if (ipStats.tokenBucketCount === 0) {
      try {
        await this.dropCallback(req);
      } catch (error) {
        throw new TokenBucketIngressHandlerError("E");
      }
    } else {
      ipStats.tokenBucketCount--;

      try {
        await this.forwardCallback(req);
      } catch (error) {
        throw new TokenBucketIngressHandlerError(`E`);
      }
    }
  }
}

export class TokenBucketIngressHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TokenBucketIngressHandlerError.name;
  }
}

/**
 * A RateLimitStats interface with token count for a token bucket implementation
 */
interface TokenBucketRateLimitStats extends RateLimitStats {
  tokenBucketCount: number;
}

/**
 * Builds a TokenBucketIngressHandler using a fwd and drop handler (to fork dropped vs fwded traffic), and an optional validation schema
 * for the ingress payload.
 */
export function getTokenBucketHandler<T extends ClientRequest>(
  ingressCapacity: number,
  ingressTimeWindowMs: number,
  fwdHandler: IngressHandler<T>,
  dropHandler: IngressHandler<T>,
  schema?: ZodType<T, ZodTypeDef, T>
): IngressHandler<T> {
  return new TokenBucketIngressHandler<T>(
    {
      ingressCapacity,
      ingressTimeWindowMs,
    },
    fwdHandler.handle,
    dropHandler.handle
  );
}
