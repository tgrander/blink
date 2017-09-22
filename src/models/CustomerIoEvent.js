'use strict';

class CustomerIoEvent {
  constructor(id, name, data, version) {
    this.id = id;
    this.name = name;
    this.data = data;
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  getData() {
    return this.data;
  }

  setVersion(version) {
    this.data.version = version;
  }
}

module.exports = CustomerIoEvent;
