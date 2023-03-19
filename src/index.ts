
import {run as exampleWithSlidingWindow} from "./algorithms/example/exampleWithSlidingWindow";
import {run as exampleWithTokenBucket} from "./algorithms/example/exampleWithTokenBucket";

/**
 * Script Entry Point
 *
 * Build using `yarn build`
 * Run using `yarn start`
 */
const run = () => {
  // Uncomment this to test the sliding window
  // exampleWithSlidingWindow();

  exampleWithTokenBucket();
};

run();
