const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Central Health Software API',
    description: 'CHST reference view.'
  },
  host: 'localhost:8080',
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'JWT Token',
      description: '"**JWT Token**\nJWT token, type Bearer Token, then it must have the structure: **Bearer <JWT_TOKEN>**"'
    }
  }
};

const outputFile = './swagger-chst.json';
const routes = ['./api/index.ts'];

swaggerAutogen(outputFile, routes, doc);