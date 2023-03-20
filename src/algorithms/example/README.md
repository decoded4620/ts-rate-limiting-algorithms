# Examples

This package is example implementations of different rate limiting implementations of ingress handlers.

## Terms
*Ingress* - Represents inbound traffic to a server
## Example With Token Bucket Rate Limiting
This example implements the [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket) for ingress rate limiting.

### Pros
The implementation is very simple and easy to understand / maintain

### Cons
It is subject to traffic bursts at the very end / beginning of windows, however the burst of traffic will be no larger than double the limit per interval. Keeping the intervals tighter can keep the burst from being too large.

Capacity is exactly the rate limit, so bursts of traffic will result in dropped requests if capacity is breaked.

## Example with Leaky Bucket Rate Limiting
This example implements the [Leaky Bucket Algorithm](https://en.wikipedia.org/wiki/Leaky_bucket) for ingress rate limiting.
### Pros
Traffic distribution will always be smooth since you guarantee that requests are handled at a constant rate.

Fewer requests are dropped, depending on the capacity of the bucket. E.g. even if there is burst of natural traffic, having a larger capacity than the rate limit can ensure these requests are eventually handled.
### Cons
It is subject to traffic bursts at the very end / beginning of windows, however the burst of traffic will be no larger than double the limit per interval. Keeping the intervals tighter can keep the burst from being too large.

It is subject to higher memory since the requests are kept in memory while the buckets drain.

It adds a type of "state" to the server, which is generally opposed to the "stateless" rule of an API Server, however, the state has nothing to do with the application, which is why we can still say the server is "stateless" per se.

Draining the bucket (and resizing the array) takes more cpu time than doing simple math, such as is done in the other implementations.

The Implementation less simple, and requires extra work of adding / clearing the timer intervals which drain the bucket (e.g. management of the state of requests in memory)

## Example with Sliding Window Limiting
This example implements the Sliding Window Algorithm for ingress rate limiting.
### Pros
Traffic distribution is relatively smooth due to the sliding window keeping track of requests in the previous window
### Cons
Capacity is exactly the rate limit, so bursts of traffic will result in dropped requests if capacity is breaked.