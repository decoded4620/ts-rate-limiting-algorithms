import { getSlidingWindowHandler } from "../slidingwindow/slidingwindowingresshandler";
import { IngressEntryPoint } from "../../core/ingressEntryPoint";
import { httpRequestValidationSchema } from "./types";
import { simulateTraffic } from "./helpers";
import { safeJsonStringify } from "../../core/helpers";
import { HttpRequest } from "./types";
import { IngressHandler } from "../types";

/**
 * Script Entry Point
 */
export const run = () => {
  // Construct an Ingress Entry Point
  const entryPoint = new IngressEntryPoint();

  // setup ingress handling with sliding swindow
  entryPoint.useIngressHandler(
    getSlidingWindowHandler(
      20,
      500,
      new ExampleRequestForwardHandler(),
      new ExampleRequestDropHandler(),
      httpRequestValidationSchema
    )
  );

  simulateTraffic(entryPoint);
};

/**
 * A handler called when a request should be dropped
 */
class ExampleRequestDropHandler implements IngressHandler<HttpRequest> {
  public async handle(req: HttpRequest): Promise<void> {
    console.log(`Dropping request ${safeJsonStringify(req.body)}`);
  }
}

/**
 * A handler called when a request shoud be forwarded to business logic
 */
class ExampleRequestForwardHandler implements IngressHandler<HttpRequest> {
  public async handle(req: HttpRequest): Promise<void> {
    console.log(`Forwarding request ${safeJsonStringify(req.body)}`);
  }
}
