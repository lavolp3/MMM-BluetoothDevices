'use strict';

class UnknownError extends Error {
  constructor(object) {
    super(object.exception);
    this.troubleshooting = object.troubleshooting;
    this.extra = object.extra || {};
  }
}

module.exports = UnknownError;
