'use strict';

const devices = require('./devices');
const Eventable = require('./Eventable');
const CurrentTimeService = require('./services/CurrentTimeService');

class Dongle extends Eventable {
  /**
   * @param {object} options
   */
  constructor(options) {
    super();
    this.name = options.name;
    this.interfaceName = options.interfaceName;
    this.mode = options.mode;
    this.hci = options.hci;
    this.devices = options.devices.map((device) => {
      const d = devices.initialize(device);
      d.on('update', (data) => this.emit('deviceUpdate', { device, data }));

      return d;
    });
    this.rootPath = '/org/bluez/';
    this.path = `${this.rootPath}${options.hci}`;

    this.currentTimeService = null;
  }

  setup(bus, service) {
    bus.connection.on('message', (message) => this.handleMessage(message));

    return new Promise((resolve, reject) => {
      this.setupServices(bus, service)
        .then(() => console.log('services done'))
        .then(() => {
          console.log('this.getInterface(service)');
          return this.getInterface(service);
        })
        .then((adapter) => {
          console.log('this.stopDiscovery(adapter)');
          return this.stopDiscovery(adapter);
        })
        .then((adapter) => {
          console.log('this.startDiscovery(adapter)');
          return this.startDiscovery(adapter);
        })
        .then(() => {
          console.log('this.connectDevices(service)');
          return this.connectDevices(service);
        })
        .then(() => this.emit('setupCompleted'))
        .then(() => resolve(this))
        .catch(reject);
    });
  }

  async destroy() {
    const promises = [];
    for (const device in this.devices) {
      promises.push(device.destroy());
    }

    return Promise.all(promises)
      .then(() => this.currentTimeService.destroy());
  }

  setupServices(bus, service) {
    return new Promise(async (resolve, reject) => {
      this.currentTimeService = new CurrentTimeService(bus, service, { hci: this.hci });

      try {
        await this.currentTimeService.initialize();
        resolve();
      } catch (exception) {
        reject(exception);
      }
    });
  }

  getInterface(service) {
    return new Promise((resolve, reject) => {
      service.getInterface(this.path, this.interfaceName, (exception, adapter) => {
        if (exception) {
          reject(exception);
        } else {
          resolve(adapter);
        }
      });
    });
  }

  stopDiscovery(adapter) {
    return new Promise((resolve, reject) => {
      adapter.StopDiscovery((exception) => {
        if (exception) {
          exception = Array.isArray(exception) ? exception.join('.') : exception;

          if (exception === 'No discovery started') {
            resolve(adapter);
          } else {
            reject(new Error(`Unknown stop discovery exception: ${exception}`));
          }
        } else {
          resolve(adapter);
        }
      });
    });
  }

  startDiscovery(adapter) {
    return new Promise((resolve, reject) => {
      adapter.SetDiscoveryFilter([['Transport', ['s', this.mode]]], (exception) => {
        if (exception) {
          reject(exception);
        } else {
          adapter.StartDiscovery((err) => {
            if (err) {
              reject(exception);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  handleMessage(message) {
    if (
      message && message.path && typeof message.path.indexOf === 'function'
      && message.path.indexOf(this.path) === 0
    ) {
      if (Array.isArray(message.body)) {
        if (message.body[0] === 'org.bluez.Device1') {
          let dev = message.path.split('/');
          dev = dev[dev.length - 1];

          const props = {};
          if (Array.isArray(message.body[1])) { // TODO: Write a working parser for this mess of arrays
            message.body[1].forEach((prop) => {
              if (Array.isArray(prop) && prop.length === 2 && Array.isArray(prop[1])) {
                const key = prop[0];
                let val = prop[1][1];

                if (Array.isArray(val)) {
                  if (key === 'ManufacturerData') {
                    try {
                      val = val[0][0][1][1][0];
                    } catch (e) {
                      console.reject('reject', e);
                    }
                  } else if (key === 'ServiceData') {
                    try {
                      val = {
                        UUID: val[0][0][0],
                        data: val[0][0][1][1][0],
                      };
                    } catch (e) {
                      console.reject('reject', e);
                    }
                  } else if (val.length === 1) {
                    val = val[0];
                  }
                }

                props[key] = val;
              }
            });
          } else {
            console.log('Unhandled Device msg:', msg, JSON.stringify(msg));
          }

          this.devices.map((device) => device.update(message.body[0], dev, props));
        } else if (message.body[0] === 'org.bluez.GattCharacteristic1') {
          const splitPath = message.path.split('/');
          const dev = splitPath[4];
          const characteristic = [splitPath[5], splitPath[6]].join('/');

          if (Array.isArray(message.body[1]) && Array.isArray(message.body[1][0]) && message.body[1][0][0] === 'Value') {
            const props = {};
            const value = message.body[1][0][1][1][0];

            props[characteristic] = value;

            this.devices.map((device) => device.update(message.body[0], dev, props));
          }
        } else if (message && Array.isArray(message.body) && message.body[0] === 'org.bluez.Adapter1') {
          if (JSON.stringify(message).includes('["Powered",[[{"type":"b","child":[]}],[false]]]')) {
            // yes, this is terrible, but I have absolutely no motivation to build a parser for this
            // shitty array of arrays format and there might be more propertys and a different order


            this.emit('death', message);
          } else {
            // unhandled adapter message
          }
        } else {
          console.log('Unhandled other message:', message, JSON.stringify(message));
        }
      }
    }
  }

  async connectDevices(service) {
    const promises = [];

    for (const device of this.devices) {
      promises.push(this.connectDevice(service, device));
    }

    await Promise.all(promises);
  }

  connectDevice(service, device, maxTries = 3) {
    return new Promise(async (resolve, reject) => {
      const deviceInterface = await this.getDeviceInterface(
        service,
        `${this.path}/${device.macPath}`,
        'org.bluez.Device1',
      );

      return device.connect(deviceInterface, maxTries);
    });
  }

  getDeviceInterface(service, path, ifaceName) {
    return new Promise(((resolve, reject) => {
      service.getInterface(path, ifaceName, (exception, iFace) => {
        exception = Array.isArray(exception) ? exception.join('.') : exception;

        if (exception) {
          reject(exception);
        } else {
          resolve(iFace);
        }
      });
    }));
  }
}

module.exports = Dongle;
