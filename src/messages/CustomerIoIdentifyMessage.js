'use strict';

const Joi = require('joi');
const moment = require('moment');

const Message = require('./Message');

class CustomerIoIdentifyMessage extends Message {

  constructor(...args) {
    super(...args);
    // Data validation rules.
    // TODO: move to helpers.
    const whenNullOrEmpty = Joi.valid(['', null]);
    const optionalStringDefaultsToUndefined = Joi
      .string()
      .empty(whenNullOrEmpty)
      .default(undefined);

    const optionalTimestampDefaultsToUndefined = Joi
      .date()
      .timestamp('unix')
      .raw()
      .empty(whenNullOrEmpty)
      .default(undefined);

    this.schema = Joi.object().keys({
      id: Joi.string().required().regex(/^[0-9a-f]{24}$/, 'valid object id'),
      data: Joi.object().keys({
        // Remove field when provided as empty string or null.
        email: Joi.string().empty(whenNullOrEmpty).default(undefined),

        // TODO: make sure has E.164 format
        // phone: Joi.string().empty(whenNullOrEmpty).default(undefined),

        // Required:
        updated_at: Joi.date().timestamp('unix').raw().required(),
        created_at: Joi.date().timestamp('unix').raw().required(),

        mobile_status: Joi.valid([
          'active',
          'undeliverable',
          'unknown',
          null,
        ]).default(undefined),

        // Optional, defaults to undefined when provided as empty string or null.
        last_authenticated_at: optionalTimestampDefaultsToUndefined,
        // Exception: kept as an isodate
        birthdate: Joi.string().isoDate().empty(whenNullOrEmpty).default(null),
        first_name: optionalStringDefaultsToUndefined,
        last_name: optionalStringDefaultsToUndefined,
        addr_city: optionalStringDefaultsToUndefined,
        addr_state: optionalStringDefaultsToUndefined,
        addr_zip: optionalStringDefaultsToUndefined,
        source: optionalStringDefaultsToUndefined,
        source_detail: optionalStringDefaultsToUndefined,
        language: optionalStringDefaultsToUndefined,
        country: optionalStringDefaultsToUndefined,
        unsubscribed: Joi.boolean(),

        // Allow anything as a role, but default to user.
        role: Joi.string().empty(whenNullOrEmpty).default('user'),

        // When interests not present, make them an empty array.
        interests: Joi.array().items(Joi.string()).empty(null).default(undefined),

        // TODO: add cio specific fields, like unsubscribed_at
      }),
      // TODO: Bring back when phone is formatted in Northstar
      // .or('email', 'phone'),
    });
  }

  static fromUser(userMessage) {
    const user = userMessage.payload.data;
    // Copy user fields.
    const customerData = Object.assign({}, user);
    // Remove id from data, as it's available on top level.
    delete customerData.id;

    // Rename mobilecommon_status to mobile_status
    if (customerData.mobilecommon_status) {
      const mobileStatus = customerData.mobilecommon_status;
      delete customerData.mobilecommon_status;
      customerData.mobileStatus = mobileStatus;
    }

    // Rename mobile to phone
    // TODO: format phone

    if (customerData.mobile) {
      // const mobile = customerData.mobile;
      delete customerData.mobile;
      // TODO: Bring back when phone is formatted in Northstar
      // customerData.phone = mobile;
    }

    customerData.created_at = moment(customerData.created_at, moment.ISO_8601).unix();
    customerData.updated_at = moment(customerData.updated_at, moment.ISO_8601).unix();

    if (customerData.last_authenticated_at) {
      customerData.last_authenticated_at = moment(
        customerData.last_authenticated_at,
        moment.ISO_8601
      ).unix();
    }

    // TODO: Only explicitly set for new users.
    customerData.unsubscribed = false;

    // TODO: Transform timestamps

    const customerIoIdentifyMessage = new CustomerIoIdentifyMessage({
      data: {
        id: user.id,
        data: customerData,
      },
      meta: {
        request_id: userMessage.payload.meta.request_id,
      },
    });
    return customerIoIdentifyMessage;
  }

}

module.exports = CustomerIoIdentifyMessage;