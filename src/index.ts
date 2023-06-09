
import {run as exampleWithSlidingWindow} from "./algorithms/example/exampleWithSlidingWindow";
import {run as exampleWithTokenBucket} from "./algorithms/example/exampleWithTokenBucket";
import {run as exampleWithLeakyBucket} from "./algorithms/example/exampleWithLeakyBucket";
import {run as exampleWithFixedWindow} from "./algorithms/example/exampleWithFixedWindow";

/**
 * Script Entry Point
 *
 * Build using `yarn build`
 * Run using `yarn start`
 */
const run = () => {
  // Uncomment this to test the sliding window
  exampleWithSlidingWindow();

  // Uncomment this to test the fixed window
  // exampleWithFixedWindow();

  // Uncomment this to test the token bucket
  // exampleWithTokenBucket();

  // Uncomment this to test the leaky bucket
  // exampleWithLeakyBucket();
};

run();
