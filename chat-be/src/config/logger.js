const winston = require('winston');

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
});

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level} → ${message}`;
  })
);

const logger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

module.exports = logger;