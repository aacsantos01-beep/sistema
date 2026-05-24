const app = require('../server/src/index');

// Handle both ES Module default export and CommonJS
module.exports = app.default || app;
