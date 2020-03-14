'use strict';

class Eventable {
  constructor() {
    this.triggers = {};
  }

  on(event, callback) {
    if (!this.triggers[event]) {
      this.triggers[event] = [];
    }

    this.triggers[event].push(callback);
  }

  emit(event, params) {
    if (this.triggers[event]) {
      for (const trigger of this.triggers[event]) {
        trigger(params);
      }
    }
  }
}

module.exports = Eventable;
