import { getSlidingWindowHandler } from "../slidingwindow/slidingWindowIngressHandler";
import { IngressEntryPoint } from "../../core/ingressEntryPoint";
import {
  ExampleRequestDropHandler,
  ExampleRequestForwardHandler,
  httpRequestValidationSchema,
} from "./types";
import { simulateTraffic } from "./helpers";

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
      new ExampleRequestDropHandler()
    ),
    httpRequestValidationSchema
  );

  simulateTraffic(entryPoint);
};
