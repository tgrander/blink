'use strict';

const WebController = require('../../lib/WebController');

class ApiController extends WebController {
  constructor(...args) {
    super(...args);
    // Bind web methods to object context so they can be passed to router.
    this.index = this.index.bind(this);
    this.v1 = this.v1.bind(this);
  }

  async index(ctx) {
    ctx.body = {
      v1: this.fullUrl('api.v1'),
    };
  }

  async v1(ctx) {
    ctx.body = {};
  }
}

module.exports = ApiController;