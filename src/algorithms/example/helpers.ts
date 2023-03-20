import { IngressHandler } from "../types";
import { TrafficSimulator } from "./trafficSimulator";

/**
 * Example Helper to Simulate Traffic on an Ingress Handler
 *
 * @param handler
 */
export function simulateTraffic<T>(handler: IngressHandler<T>) {
  // simulate 3 clients, one bursty one not, one spoof
  [
    makeTrafficSimulator(handler, "1.2", 25, "Smooth", 0),
    makeTrafficSimulator(handler, "1.3", 50, "Burst", 10),
    makeTrafficSimulator(handler, "1.4", 500, "Slow", 0),
    makeTrafficSimulator(handler, "", 200, "Spoof", 0),
  ].forEach((sim) => sim.simulateTraffic());
}

/**
 * Creates a single client traffic simulator
 */
function makeTrafficSimulator<T>(
  handler: IngressHandler<T>,
  clientIp: string,
  intervalTimeMs: number,
  payloadContent: string,
  randomBurstSeedMax: number
): TrafficSimulator {
  return new TrafficSimulator({
    handler,
    intervalTimeMs,
    randomBurstSeedMax,
    payload: {
      body: {
        data: {
          content: payloadContent,
        },
      },
      ip: () => clientIp,
    },
  });
}
