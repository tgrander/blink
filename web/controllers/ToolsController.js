'use strict';

const WebController = require('../../lib/WebController');

class ToolsController extends WebController {
  constructor(...args) {
    super(...args);
    // Bind web methods to object context so they can be passed to router.
    this.index = this.index.bind(this);
  }

  async index(ctx) {
    ctx.body = {
      fetch: this.fullUrl('api.v1.tools.fetch'),
    };
  }

  async fetch(ctx) {
    console.dir(ctx.request.body, { colors: true, showHidden: true });
    WebController.replyOK(ctx);
    return;
  }
}

module.exports = ToolsController;
