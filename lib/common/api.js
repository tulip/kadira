function dispatchFn(subscriberArray) {
  return function dispatch() {
    const args = arguments;
    subscriberArray.forEach(fn => fn.apply(undefined, args));
  }
}

const errorSubscribers = [];

Kadira.onError = fn => errorSubscribers.push(fn);
Kadira._callErrorSubscribers = dispatchFn(errorSubscribers);


const metricsSubscribers = [];

Kadira.onMetrics = fn => metricsSubscribers.push(fn);
Kadira._callMetricsSubscribers = dispatchFn(metricsSubscribers);
