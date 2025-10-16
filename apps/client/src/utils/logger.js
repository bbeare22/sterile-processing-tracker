const isProd = import.meta.env.MODE === "production";

const logger = {
  debug: (...args) => {
    if (!isProd) console.debug(...args);
  },
  info: (...args) => {
    if (!isProd) console.info(...args);
  },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;
