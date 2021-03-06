var hostname = Npm.require('os').hostname();
var logger = Npm.require('debug')('kadira:apm');
var Fibers = Npm.require('fibers');

Kadira.models = {};
Kadira.options = {};
Kadira.env = {
  currentSub: null, // keep current subscription inside ddp
  kadiraInfo: new Meteor.EnvironmentVariable(),
};
Kadira.waitTimeBuilder = new WaitTimeBuilder();
Kadira.errors = [];
Kadira.errors.addFilter = Kadira.errors.push.bind(Kadira.errors);

Kadira.models.methods = new MethodsModel();
Kadira.models.pubsub = new PubsubModel();
Kadira.models.system = new SystemModel();
Kadira.docSzCache = new DocSzCache(100000, 10);


Kadira.connect = function(options) {
  options = options || {};
  options.payloadTimeout = options.payloadTimeout || 1000 * 20;
  options.clientEngineSyncDelay = options.clientEngineSyncDelay || 10000;
  options.thresholds = options.thresholds || {};
  options.isHostNameSet = !!options.hostname;
  options.hostname = options.hostname || hostname;
  options.proxy = options.proxy || null;

  if(options.documentSizeCacheSize) {
    Kadira.docSzCache = new DocSzCache(options.documentSizeCacheSize, 10);
  }

  // remove trailing slash from endpoint url (if any)
  if(_.last(options.endpoint) === '/') {
    options.endpoint = options.endpoint.substr(0, options.endpoint.length - 1);
  }

  // error tracking is enabled by default
  if(options.enableErrorTracking === undefined) {
    options.enableErrorTracking = true;
  }

  Kadira.options = options;
  Kadira.options.authHeaders = {};

  Kadira.models.error = new ErrorModel();

  // handle pre-added filters
  var addFilterFn = Kadira.models.error.addFilter.bind(Kadira.models.error);
  Kadira.errors.forEach(addFilterFn);
  Kadira.errors = Kadira.models.error;

  if(options.enableErrorTracking) {
    Kadira.enableErrorTracking();
  } else {
    Kadira.disableErrorTracking();
  }

  // start tracking errors
  Meteor.startup(function () {
    TrackUncaughtExceptions();
    TrackMeteorDebug();
  });

  // notify we've connected
  Kadira.connected = true;

  Kadira._schedulePayloadSend();
};

//track how many times we've sent the data (once per minute)
Kadira._buildPayload = function () {
  var payload = {host: Kadira.options.hostname};
  var buildDetailedInfo = Kadira._isDetailedInfo();
  _.extend(payload, Kadira.models.methods.buildPayload(buildDetailedInfo));
  _.extend(payload, Kadira.models.pubsub.buildPayload(buildDetailedInfo));
  _.extend(payload, Kadira.models.system.buildPayload());

  return payload;
}

Kadira._countDataSent = 0;
Kadira._detailInfoSentInterval = Math.ceil((1000*60) / Kadira.options.payloadTimeout);
Kadira._isDetailedInfo = function () {
  return (Kadira._countDataSent++ % Kadira._detailInfoSentInterval) == 0;
}

Kadira._schedulePayloadSend = function () {
  setInterval(function () {
    Kadira._sendPayload();
  }, Kadira.options.payloadTimeout);
}

Kadira._sendPayload = function () {
  new Fibers(function() {
    var payload = Kadira._buildPayload();
    Kadira._callMetricsSubscribers(payload);
  }).run();
}

// this return the __kadiraInfo from the current Fiber by default
// if called with 2nd argument as true, it will get the kadira info from
// Meteor.EnvironmentVariable
//
// WARNNING: returned info object is the reference object.
//  Changing it might cause issues when building traces. So use with care
Kadira._getInfo = function(currentFiber, useEnvironmentVariable) {
  currentFiber = currentFiber || Fibers.current;
  if(currentFiber) {
    if(useEnvironmentVariable) {
      return Kadira.env.kadiraInfo.get();
    }
    return currentFiber.__kadiraInfo;
  }
};

// this does not clone the info object. So, use with care
Kadira._setInfo = function(info) {
  Fibers.current.__kadiraInfo = info;
};

Kadira.enableErrorTracking = function () {
  Kadira.options.enableErrorTracking = true;
};

Kadira.disableErrorTracking = function () {
  Kadira.options.enableErrorTracking = false;
};

Kadira.trackError = function (type, message, options) {
  if(Kadira.options.enableErrorTracking && type && message) {
    options = options || {};
    options.subType = options.subType || 'server';
    options.stacks = options.stacks || '';
    var error = {message: message, stack: options.stacks};
    var trace = {
      type: type,
      subType: options.subType,
      name: message,
      errored: true,
      at: Date.now(),
      events: [['start', 0, {}], ['error', 0, {error: error}]],
      metrics: {total: 0}
    };
    Kadira.models.error.trackError(error, trace);
  }
}

Kadira.ignoreErrorTracking = function (err) {
  err._skipKadira = true;
}
