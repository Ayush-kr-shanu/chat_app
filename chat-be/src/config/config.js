const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
    PORT: process.env.PORT || 8181,
    DB_URL: process.env.DB_URL,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT: {
        SECRET: process.env.JWT_SECRET,
        ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '3',
        REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7',
    }
};