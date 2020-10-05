const winston = require('winston');
require('winston-daily-rotate-file');
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`+(info.splat!==undefined?`${info.splat}`:" "))

  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.DailyRotateFile({
      filename: '/tmp/node_error.%DATE%.log',
      level: 'error',
      prepend: true,
      handleExceptions: true,
      prettyPrint:true,
      maxSize: '20m',
      maxFiles: '7d'
    }),
    new (winston.transports.DailyRotateFile)({
      filename: '/tmp/node_combined.%DATE%.log',
      level: 'info',
      prepend: true,
      handleExceptions: true,
      prettyPrint:true,
      maxSize: '20m',
      maxFiles: '7d'
    }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
//if (process.env.ENVIRONMENT !== 'prod') {
  logger.add(new winston.transports.Console({
    colorize: true,
    'timestamp': true,
    format: winston.format.simple(),
  }));
//}

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
