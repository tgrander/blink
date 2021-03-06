'use strict';

// ------- Imports -------------------------------------------------------------

const chai = require('chai');
const Chance = require('chance');
const test = require('ava');

const RabbitManagement = require('../../../helpers/RabbitManagement');
const HooksHelper = require('../../../helpers/HooksHelper');
const MessageFactoryHelper = require('../../../helpers/MessageFactoryHelper');

// ------- Init ----------------------------------------------------------------

chai.should();
test.beforeEach(HooksHelper.startBlinkWebApp);
test.afterEach(HooksHelper.stopBlinkWebApp);

const chance = new Chance();

// ------- Tests ---------------------------------------------------------------

/**
 * GET /api/v1/webhooks
 */
test('GET /api/v1/webhooks should respond with JSON list available webhooks', async (t) => {
  const res = await t.context.supertest.get('/api/v1/webhooks')
    .auth(t.context.config.app.auth.name, t.context.config.app.auth.password);

  res.status.should.be.equal(200);

  // Check response to be json
  res.header.should.have.property('content-type');
  res.header['content-type'].should.match(/json/);

  // Check response.
  // TODO: check in loop or use .equal()?
  res.body.should.have.property('customerio-email-activity')
    .and.have.string('/api/v1/webhooks/customerio-email-activity');

  res.body.should.have.property('twilio-sms-broadcast')
    .and.have.string('/api/v1/webhooks/twilio-sms-broadcast');

  res.body.should.have.property('twilio-sms-inbound')
    .and.have.string('/api/v1/webhooks/twilio-sms-inbound');

  res.body.should.have.property('customerio-sms-broadcast')
    .and.have.string('/api/v1/webhooks/customerio-sms-broadcast');
});

/**
 * POST /api/v1/webhooks/customerio
 */
test.serial('POST /api/v1/webhooks/customerio-email-activity should publish message to customer-io queue', async (t) => {
  const data = {
    data: {
      campaign_id: '0',
      customer_id: 'example_customer',
      email_address: 'example@customer.io',
      email_id: 'example_email',
      subject: 'Example Email',
      template_id: '0',
    },
    event_id: 'abc123',
    event_type: 'example_webhook',
    timestamp: 1491337360,
  };

  const res = await t.context.supertest.post('/api/v1/webhooks/customerio-email-activity')
    .auth(t.context.config.app.auth.name, t.context.config.app.auth.password)
    .send(data);

  res.status.should.be.equal(202);

  // Check response to be json
  res.header.should.have.property('content-type');
  res.header['content-type'].should.match(/json/);

  // Check response.
  res.body.should.have.property('ok', true);

  // Check that the message is queued.
  const rabbit = new RabbitManagement(t.context.config.amqpManagement);
  // Note: might be in conflict with POST /api/v1/events/quasar-relay test
  const messages = await rabbit.getMessagesFrom('quasar-customer-io-email-activity', 1, false);
  messages.should.be.an('array').and.to.have.lengthOf(1);

  messages[0].should.have.property('payload');
  const payload = messages[0].payload;
  const messageData = JSON.parse(payload);
  messageData.should.have.property('data');
  messageData.data.should.be.eql(data);
});

/**
 * POST /api/v1/webhooks/twilio-sms-inbound
 */
test('POST /api/v1/webhooks/twilio-sms-inbound should publish message to twilio-sms-inbound-gambit-relay queue', async (t) => {
  const data = {
    random: 'key',
    nested: {
      random2: 'key2',
    },
  };

  const res = await t.context.supertest.post('/api/v1/webhooks/twilio-sms-inbound')
    .auth(t.context.config.app.auth.name, t.context.config.app.auth.password)
    .send(data);

  // Ensure TwiML compatible response.
  res.status.should.be.equal(204);
  res.res.statusMessage.toLowerCase().should.equal('no content');
  res.header.should.not.have.property('content-type');
  res.text.should.equal('');

  // Check that the message is queued.
  const rabbit = new RabbitManagement(t.context.config.amqpManagement);
  const messages = await rabbit.getMessagesFrom('twilio-sms-inbound-gambit-relay', 1, false);
  messages.should.be.an('array').and.to.have.lengthOf(1);

  messages[0].should.have.property('payload');
  const payload = messages[0].payload;
  const messageData = JSON.parse(payload);
  messageData.should.have.property('data');
  messageData.data.should.be.eql(data);
});

/**
 * POST /api/v1/webhooks/customerio-sms-broadcast
 */
test('POST /api/v1/webhooks/customerio-sms-broadcast should publish message to customerio-sms-broadcast-relay queue', async (t) => {
  const broadcastId = chance.word();
  const data = MessageFactoryHelper.getValidCustomerBroadcastData(broadcastId);

  const res = await t.context.supertest.post('/api/v1/webhooks/customerio-sms-broadcast')
    .set('Content-Type', 'application/json')
    .auth(t.context.config.app.auth.name, t.context.config.app.auth.password)
    .send(data);

  // Ensure Customer.io compatible response.
  res.status.should.be.equal(201);

  // Check response to be json
  res.header.should.have.property('content-type');
  res.header['content-type'].should.match(/json/);

  // Check response.
  res.body.should.have.property('ok', true);

  // Check that the message is queued.
  const rabbit = new RabbitManagement(t.context.config.amqpManagement);
  const messages = await rabbit.getMessagesFrom('customerio-sms-broadcast-relay', 1, false);
  messages.should.be.an('array').and.to.have.lengthOf(1);

  messages[0].should.have.property('payload');
  const payload = messages[0].payload;
  const messageData = JSON.parse(payload);
  messageData.should.have.property('data');
  messageData.data.should.be.eql(data);
});

/**
 * POST /api/v1/webhooks/customerio-sms-broadcast
 */
test('POST /api/v1/webhooks/customerio-sms-broadcast validates incoming payload', async (t) => {
  const broadcastId = chance.word();
  const data = MessageFactoryHelper.getValidCustomerBroadcastData(broadcastId);
  delete data.To;

  const res = await t.context.supertest.post('/api/v1/webhooks/customerio-sms-broadcast')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .auth(t.context.config.app.auth.name, t.context.config.app.auth.password)
    .send(data);

  res.status.should.be.equal(422);
  res.body.should.have.property('ok', false);
  res.body.should.have.property('message')
    .and.have.string('"To" is required');
});

// ------- End -----------------------------------------------------------------
