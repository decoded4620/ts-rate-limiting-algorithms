import { getErrorMessage } from "../core/helpers";
import { IngressError } from "../core/ingressEntryPoint";

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
   * The time frame for measuring capacity usually in milliseconds
   */
  ingressTimeFrame: number;

  /**
   * Max requests for the window
   */
  ingressCapacity: number;
}

/**
 * Interface for Rate Limiting Stats tracking within an integress handler.
 */
export interface RateLimitStats {
  clientIp: string;
  currentIngressCount: number;
  timeFrameStartTime: number;
}

export abstract class RateLimitedIngressHandler<T>
  implements IngressHandler<T>
{
  constructor(
    private readonly forwardCallback: (req: T) => Promise<void>,
    private readonly dropCallback: (req: T, reason?: string) => Promise<void>
  ) {}

  /**
   * Request Ingress Traffic Fixed Window Entry Point
   * @param req The request
   */
  public abstract handle(req: T): Promise<void>;

  /**
   * Tries to forward a received request after checking `isOverCapacity()` is `false`
   * @param req the request
   */
  protected async tryForwardingRequest(req: T): Promise<void> {
    try {
      await this.forwardCallback(req);
    } catch (error) {
      throw new IngressHandlerError(
        `Error forwarding request callback: ${getErrorMessage(error)}`
      );
    }
  }

  protected async tryDroppingRequest(req: T, reason?: string): Promise<void> {
    try {
      await this.dropCallback(req, reason);
    } catch (error) {
      throw new IngressHandlerError(
        `Error dropping request callback ${getErrorMessage(error)}`
      );
    }
  }
}

export class IngressHandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = IngressHandlerError.name;
  }
}
