import { IngressHandler } from "../types";
import { IngressEntryPoint } from "../../core/ingressEntryPoint";

export interface TrafficSimulatorConfig {
  handler: IngressHandler<unknown>;
  randomBurstSeedMax: number;
  intervalTimeMs: number;
  payload: unknown;
}

/**
 * Simulates traffic to an ingress entry point
 */
export class TrafficSimulator {
  private interval: NodeJS.Timer | undefined;

  constructor(private readonly config: TrafficSimulatorConfig) {}

  public stopTraffic() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  public simulateTraffic() {
    this.stopTraffic();

    this.interval = setInterval(() => {
      // create a random burst seed between one and max random seed
      let randomSeed = Math.max(
        1,
        Math.round(Math.random() * (this.config.randomBurstSeedMax - 1) + 1)
      );
      // pick a number between 1 and random seed each time we're called to simulate random bursting
      let randomBurst = Math.round(Math.random() * (randomSeed - 1)) + 1;

      while (randomBurst > 0) {
        randomBurst--;
        this.config.handler.handle(this.config.payload);
      }
    }, this.config.intervalTimeMs);
  }
}
