ErrorModel = function(options) {
  BaseErrorModel.call(this);
  options = options || {};
  options.maxErrorsPerInterval = options.maxErrorsPerInterval || 10;
  options.intervalInMillis = options.intervalInMillis || 1000 * 60 *2; //2 mins
  options.waitForNtpSyncInterval = options.waitForNtpSyncInterval || 0;
  var self = this;

  self.options = options;

  // errorsSentCount will be reseted at the start of the interval
  self.errorsSentCount = 0;
  self.errorsSent = {};
};

_.extend(ErrorModel.prototype, BaseErrorModel.prototype);

ErrorModel.prototype.sendError = function(errorDef, err, force) {
  var self = this;
  if(!this.applyFilters('client', errorDef.name, err, errorDef.subType)) {
    return;
  };

  Kadira._callErrorSubscribers(err, errorDef);
};


ErrorModel.prototype.isErrorExists = function(name) {
  return !!this.errorsSent[name];
};

ErrorModel.prototype.increamentErrorCount = function(name) {
  var error = this.errorsSent[name];
  if(error) {
    error.count++;
  }
};

ErrorModel.prototype.canSendErrors = function() {
  return this.errorsSentCount < this.options.maxErrorsPerInterval;
};

ErrorModel.prototype.close = function() {
  clearTimeout(this.intervalTimeoutHandler);
};
