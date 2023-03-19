import { z, ZodType, ZodTypeDef } from "zod";

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
