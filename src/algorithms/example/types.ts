import { z, ZodType, ZodTypeDef } from "zod";
import { safeJsonStringify } from "../../core/helpers";
import { IngressHandler } from "../types";

// Request from an ip address based client
export interface ClientRequest {
  ip(): string;
}

// Http Protocol Request
export interface HttpRequest extends ClientRequest {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
}

export const httpRequestValidationSchema: ZodType<
  HttpRequest,
  ZodTypeDef,
  HttpRequest
> = z.object({
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  ip: z.function().returns(z.string()),
});


/**
 * A handler called when a request should be dropped
 */
export class ExampleRequestDropHandler implements IngressHandler<HttpRequest> {
  public async handle(req: HttpRequest): Promise<void> {
    console.log(`Dropping request ${safeJsonStringify(req.body)}`);
  }
}

/**
 * A handler called when a request shoud be forwarded to business logic
 */
export class ExampleRequestForwardHandler implements IngressHandler<HttpRequest> {
  public async handle(req: HttpRequest): Promise<void> {
    console.log(`Forwarding request ${safeJsonStringify(req.body)}`);
  }
}