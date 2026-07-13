const isDev =
  (typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    process.env.NODE_ENV === 'development') ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'));

const CONFIG = {
  API_BASE_URL: isDev ? 'http://localhost:3001' : '',
};

export default CONFIG;
