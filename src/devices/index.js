'use strict';

const OralBToothbrush = require('./OralBToothbrush');

const devices = {
  OralBToothbrush,
};

module.exports.initialize = (options) => {
  if (devices.hasOwnProperty(options.type)) {
    return new devices[options.type](options);
  }

  throw new Error(`Unknown device: ${options.type}`);
};
