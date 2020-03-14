'use strict';

const dbus = require('dbus-native');
const Dongle = require('./Dongle');

const bus = dbus.systemBus();
const service = bus.getService('org.bluez');

bus.addMatch("type='signal'");

module.exports.initialize = (config) => {
  const dongle = new Dongle(config);

  dongle.setup(bus, service)
    .catch((exception) => {
      console.error('unhandled exception', exception);
      process.exit(1);
    });

  return dongle;
};
