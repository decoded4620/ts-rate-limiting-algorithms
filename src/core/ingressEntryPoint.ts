import { ZodType, ZodTypeDef } from "zod";
import { getErrorMessage } from "./helpers";
import { IngressHandler } from "../algorithms/types";

/**
 * Entry point for ingress traffic.
 */
export class IngressEntryPoint implements IngressHandler<unknown> {
  // here we delegate to a handler which implements some algorithm for handling ingress traffic
  private ingressHandlerDelegate?: IngressHandler<unknown>;

  // an optional schema for validating ingress traffic payloads. For instance an HTTP Request payload
  private validationSchema?: ZodType<unknown, ZodTypeDef, unknown>;

  constructor() {}

  /**
   * Set the ingress handler to use for ingress traffic. If none is used, an error is thrown
   * Having this as a separate method enables the handler to be swapped out in real-time, and doesn't bind the entry point
   * to a specific type of ingress handler (since handler is generic).
   *
   * @param handler A ValidatingIngressHandler to use
   * @param validationSchema an optional Zod Schema to validate the request.
   */
  public useIngressHandler<T>(
    handler: IngressHandler<T>,
    validationSchema?: ZodType<T, ZodTypeDef, T>
  ): void {
    this.ingressHandlerDelegate = handler;
    this.validationSchema = validationSchema;
  }

  /**
   * This method handles the ingress, internally validates the shape using the ingress handlers validation schema and
   * delegates the request to the delegate handler.
   *
   * @param request Request payload for handling by the delegate
   */
  public async handle(request: unknown): Promise<void> {
    if (this.ingressHandlerDelegate) {
      // validate the request shape
      if (this.validationSchema) {
        try {
          this.validationSchema.parse(request);
        } catch (error) {
          throw new IngressError(
            `Requst shape validation failed: ${getErrorMessage(error)}`
          );
        }
      }

      try {
        // handle the request
        this.ingressHandlerDelegate.handle(request);
      } catch (error) {
        throw new IngressError(
          `Request handling failed: ${getErrorMessage(error)}`
        );
      }
    } else {
      throw new IngressError(
        `No ingress handler assigned to ingress entry point`
      );
    }
  }
}

export class IngressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = IngressError.name;
  }
}
