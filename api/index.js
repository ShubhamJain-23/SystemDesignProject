const { handleApiRequest } = require('../src/app');

// Vercel Serverless Function Handler
module.exports = (req, res) => {
  return handleApiRequest(req, res);
};
