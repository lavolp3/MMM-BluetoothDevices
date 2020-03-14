'use strict';

const NodeHelper = require('node_helper');
const hub = require('./src');

module.exports = NodeHelper.create({
  config: {},
  started: false,
  devices: {},
  dongle: null,

  start() {
    console.log(`Starting node helper for: ${this.name}`);
  },

  startHub(config) {
    if (this.started) {
      return;
    }

    this.started = true;

    console.log(`Starting hub for: ${this.name}`);

    this.config = config;
    this.dongle = hub.initialize(this.config);

    this.dongle.on('setupCompleted', () => {
      console.log(`Hub successfully started for: ${this.name}`);
    });

    this.dongle.on('deviceUpdate', ({ device, data }) => {
      this.devices[device.name] = { device, data };

      console.log(`${this.name} received device update for ${device.name}`);

      this.sendSocketNotification('FETCH_TOOTHBRUSHES_RESULTS', this.devices);
    });
  },

  stop() {
    if (!this.started) {
      return;
    }

    console.log(`Stopping hub for: ${this.name}`);

    hub.destroy();
  },

  socketNotificationReceived(notification, payload) {
    if (notification === 'FETCH_TOOTHBRUSHES') {
      this.startHub(payload);

      this.sendSocketNotification('FETCH_TOOTHBRUSHES_RESULTS', this.devices);
    }
  },
});
