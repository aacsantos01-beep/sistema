import app from '../server/dist/index.js';

// Handle both ES Module default export and CommonJS
export default app.default || app;
