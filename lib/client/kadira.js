Kadira.enableErrorTracking = function () {
  Kadira.options.enableErrorTracking = true;
};

Kadira.disableErrorTracking = function () {
  Kadira.options.enableErrorTracking = false;
};

Kadira.trackError = function (type, message, options) {
  if(Kadira.options.enableErrorTracking && type && message) {
    var now = (new Date()).getTime();
    options = options || {};
    _.defaults(options, {subType: 'client', stacks: ''});

    const e = new Error();
    e.message = message;
    e.stack = options.stacks;

    Kadira.errors.sendError({
      name : message,
      source : 'client',
      startTime : now,
      type : type,
      subType : options.subType,
      info : getBrowserInfo(),
    }, e);
  }
};

// Create new NTP object and error model immediately so it can be used
// endpoints is set later using __meteor_runtime_config__ or publication
Kadira.errors = new ErrorModel({
  waitForNtpSyncInterval: 1000 * 5, // 5 secs
  intervalInMillis: 1000 * 60 * 1, // 1minutes
  maxErrorsPerInterval: 5
});

Kadira.connect = function(options) {
  Kadira.options = options || {};
  _.defaults(Kadira.options, {
    errorDumpInterval: 1000*60,
    maxErrorsPerInterval: 10,
    collectAllStacks: false,
    enableErrorTracking: false,
  });

  Kadira.connected = true;
  Kadira.enableErrorTracking();

  if(window.Zone && Zone.inited) {
    Zone.collectAllStacks = Kadira.options.collectAllStacks;
  }
}

// patch jQuery ajax transport to use IE8/IE9 XDR if necessary
if(window.XDomainRequest) {
  fixInternetExplorerXDR();
}
