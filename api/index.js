const app = require('../server/dist/index');

// Handle both ES Module default export and CommonJS
module.exports = app.default || app;
