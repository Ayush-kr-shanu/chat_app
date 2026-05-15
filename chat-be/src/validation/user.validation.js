const Joi = require('joi');

const search = {
  query: Joi.object().keys({
    search: Joi.string().required(),
  }),
};

module.exports = {
  search,
};