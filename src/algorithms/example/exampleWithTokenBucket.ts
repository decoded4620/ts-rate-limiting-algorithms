import { IngressEntryPoint } from "../../core/ingressEntryPoint";
import {
  ExampleRequestDropHandler,
  ExampleRequestForwardHandler,
  httpRequestValidationSchema,
} from "./types";
import { simulateTraffic } from "./helpers";
import { getTokenBucketHandler } from "../slidingwindow/tokenBucketIngressHandler";

/**
 * Script Entry Point
 */
export const run = () => {
  // Construct an Ingress Entry Point
  const entryPoint = new IngressEntryPoint();

  // setup ingress handling with Token Bucket algorithm
  entryPoint.useIngressHandler(
    getTokenBucketHandler(
      20,
      500,
      new ExampleRequestForwardHandler(),
      new ExampleRequestDropHandler(),
      httpRequestValidationSchema
    )
  );

  simulateTraffic(entryPoint);
};
