// Vercel Node function: chuyển mọi request /api/* vào app NestJS đã build (dist/serverless.js).
module.exports = require('../dist/serverless').default;
