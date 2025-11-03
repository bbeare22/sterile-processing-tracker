const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 50 };

const levelName = (
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
).toLowerCase();
const threshold = LEVELS[levelName] ?? LEVELS.info;

function fmt(level, args) {
  const ts = new Date().toISOString();
  return [`[${ts}] ${level.toUpperCase()}:`, ...args];
}

const logger = {
  debug: (...args) => {
    if (threshold <= LEVELS.debug) console.debug(...fmt('debug', args));
  },
  info: (...args) => {
    if (threshold <= LEVELS.info) console.info(...fmt('info', args));
  },
  warn: (...args) => {
    if (threshold <= LEVELS.warn) console.warn(...fmt('warn', args));
  },
  error: (...args) => {
    if (threshold <= LEVELS.error) console.error(...fmt('error', args));
  },
};

module.exports = logger;
