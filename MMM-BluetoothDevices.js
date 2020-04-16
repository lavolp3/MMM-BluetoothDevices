/*jshint esversion: 6 */
//'use strict';

Module.register('MMM-BluetoothDevices', {
  // Default module config.
  defaults: {
    name: 'raspberrypi',
    mode: 'le',
    hci: 'hci0',
    interfaceName: 'org.bluez.Adapter1',
    services: [
      { type: 'CurrentTimeService' },
    ],
    devices: [],
    layout: {
      title: {
        position: 'bottom',
        key: 'name',
      },
      data: {
        position: 'bottom',
        fields: [
          { key: 'mode', text: 'mode' },
        ],
      },
    },
    hideAfter: 10 * 60,
  },

  getStyles() {
    return ['MMM-BluetoothDevices.css'];
  },

  // Override dom generator.
  getDom() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('toothbrushes');

    if (this.loading) {
      wrapper.innerHTML = 'Loading...';
      wrapper.className = 'light small';

      return wrapper;
    }

    const table = document.createElement('table');
    const row = document.createElement('tr');

    for (const deviceKey in this.devices) {
      const deviceType = this.devices[deviceKey].device.type;

      if (deviceType === 'OralBToothbrush') {
        row.appendChild(this.renderToothbrush(deviceKey));
      } else {
        throw new Error(`Unknown device type: ${deviceType}`);
      }
    }

    table.appendChild(row);
    wrapper.appendChild(table);

    return wrapper;
  },

  renderToothbrush(deviceKey) {
    const device = this.devices[deviceKey];
    const deviceTd = document.createElement('td');
    deviceTd.classList.add('toothbrush');
    deviceTd.style.textAlign = "center";

    const deviceCircle = document.createElement('div');
    deviceCircle.classList.add('toothbrush-circle-container');
    deviceCircle.classList.add(`toothbrush-circle-${device.data.state}`);

    const deviceCircleText = document.createElement('div');
    deviceCircleText.classList.add('toothbrush-circle-text');

    const deviceCircleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    deviceCircleSvg.classList.add('toothbrush-circle-ring');

    const deviceCircleSvgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    deviceCircleSvgCircle.classList.add('toothbrush-circle');
    deviceCircleSvgCircle.setAttribute('stroke-width', 15);
    deviceCircleSvgCircle.setAttribute('fill', 'transparent');
    deviceCircleSvgCircle.setAttribute('r', 52);
    deviceCircleSvgCircle.setAttribute('cx', 60);
    deviceCircleSvgCircle.setAttribute('cy', 60);

    deviceCircleSvg.append(deviceCircleSvgCircle);
    deviceCircle.append(deviceCircleSvg);
    deviceCircle.append(deviceCircleText);

    //const time = device.data.time > 120 ? 120 : device.data.time;
    const time = device.data.time;

    // initial start
    this.updateCircle(deviceCircleSvgCircle, deviceCircleText, time);

    if (device.data.state === 'running') {
      deviceTd.style.display = 'block';
      deviceCircleText.classList.add('bright');
      deviceCircleSvgCircle.setAttribute('stroke', '#0080fe');
      this.counters[deviceKey] = {
        time,
        interval: setInterval(() => {

          this.counters[deviceKey].time += 1;

          this.updateCircle(
            deviceCircleSvgCircle,
            deviceCircleText,
            this.counters[deviceKey].time
          );
        }, 1000),
      };
    } else {
      deviceCircleText.classList.remove("bright");
      deviceCircleSvgCircle.setAttribute('stroke', '#aaa');
      setInterval(() => {
        deviceTd.style.display = "none";
      }, this.config.hideAfter * 1000);
    }

    const deviceLabel = document.createElement('div');
    deviceLabel.classList.add('title');
    deviceLabel.classList.add('small');
    deviceLabel.innerText = device.device[this.config.layout.title.key];

    const dataContainer = document.createElement('div');
    dataContainer.classList.add('small');
    dataContainer.classList.add('light');
    for (const key in this.config.layout.data.fields) {
      const data = this.config.layout.data.fields[key];
      const field = document.createElement('div');
      field.innerText = `${data.key}: ${device.data[data.key]}`;
      dataContainer.appendChild(field);
    }

    if (this.config.layout.title.position === 'top') {
      deviceTd.appendChild(deviceLabel);
    }
    if (this.config.layout.data.position === 'top') {
      deviceTd.appendChild(dataContainer);
    }

    deviceTd.appendChild(deviceCircle);

    if (this.config.layout.title.position === 'bottom') {
      deviceTd.appendChild(deviceLabel);
    }
    if (this.config.layout.data.position === 'bottom') {
      deviceTd.appendChild(dataContainer);
    }

    return deviceTd;
  },

  updateCircle(deviceCircleSvgCircle, deviceCircleText, time) {
    var secs = time % 60;
    deviceCircleText.innerText = Math.floor(time / 60) + ":" + (secs < 10 ? "0" + secs : secs);

    const radius = parseInt(deviceCircleSvgCircle.getAttribute('r'));
    const circumference = radius * 2 * Math.PI;
    if (time > 120) { time = 120; }
    const percent = (100 / 120) * time;
    const offset = circumference - percent / 100 * circumference;
    deviceCircleSvgCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    deviceCircleSvgCircle.style.strokeDashoffset = offset;
  },

  start() {
    Log.info(`Starting module: ${this.name}`);

    this.devices = {};
    this.counters = {};
    this.loading = true;

    this.sendSocketNotification('FETCH_TOOTHBRUSHES', this.config);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === 'FETCH_TOOTHBRUSHES_RESULTS') {
      Log.info('MMM-Toothbrush: Got toothbrush results');
      this.devices = payload;

      for (const counterKey in this.counters) {
        const counter = this.counters[counterKey];
        clearInterval(counter.interval);
      }

      if (this.loading) {
        this.loading = false;
        this.updateDom(1000);
      } else {
        this.updateDom(0);
      }
    }
  },
});
