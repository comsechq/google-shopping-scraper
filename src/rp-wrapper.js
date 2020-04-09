'use strict';
const rp = require('request-promise');

module.exports = {
    rp: async (req) => {
        return await rp(req);
    }
};