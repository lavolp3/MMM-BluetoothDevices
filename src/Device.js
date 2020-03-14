'use strict';

const Eventable = require('./Eventable');

class Device extends Eventable {
  constructor(options) {
    super();
    this.name = options.name;
    this.mac = options.mac;
    this.macPath = `dev_${options.mac.replace(/:/g, '_')}`;
    this.connected = false;
    this.servicesResolved = false;
    this.resolveTimeout = 5000;
  }

  update(type, dev, props) {
    if (dev === this.macPath) {
      for (const key in props) {
        if (key === 'Connected') {
          this.connected = props[key];
        } else if (key === 'ServicesResolved') {
          this.servicesResolved = props[key];
        }
      }

      if (type === 'org.bluez.Device1') {
        this.handleAdvertisingForDevice(props);
      } else if (type === 'org.bluez.GattCharacteristic1') {
        this.handleNotificationForDevice(props);
      }
    }
  }

  connect(iFace, maxTries) {
    let tries = 1;

    const tryConnect = (_iFace, _maxTries) => {
      tries += 1;

      return new Promise((resolve, reject) => {
        if (tries <= _maxTries) {
          console.log(`Retrying ${this.name} ${tries}/${_maxTries}`);

          return connect(_iFace, _maxTries);
        }
        reject(Error(`Couldn't connect to ${this.name} after ${tries} tries.`));
      });
    };

    const connect = () => new Promise((resolve, reject) => {
      iFace.Connect(async (exception) => {
        exception = Array.isArray(exception) ? exception.join('.') : exception;

        if (exception) {
          if (exception === 'Software caused connection abort') {
            tryConnect(iFace, maxTries);
          }

          reject(exception);
        } else {
          this.connected = true;
          this.emit('connected');
          resolve();
        }
      });
    });

    return connect();
  }

  destroy() {
    this.emit('destroyed');
  }
}

module.exports = Device;
