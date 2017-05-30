## Kadira fork for customizable error and metrics handling

This is a fork of [Kadira](https://github.com/meteorhacks/kadira) that allows you
to customize handling of errors and metrics.

It removes:

- Connection to the Kadira hosted platform
- Kadira's time-sync capability

And adds:

- `Kadira.onError` and `Kadira.onMetrics` so you can report errors and metrics
  wherever you'd like. For example, you could send errors to Sentry and send
  metrics to InfluxDB.

Example:

```js
import { Kadira } from 'meteor/meteorhacks:kadira';
import Raven from 'raven';

Kadira.connect();

Kadira.onError((err, info) => {
  Raven.captureException(err);
});

Kadira.onMetrics(metrics => {
  console.log('Kadira Metrics', metrics);
});

```
