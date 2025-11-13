const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");

// -----------------------------------------
// 1️⃣ Swagger Options
// -----------------------------------------
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Freelancer Marketplace API",
      version: "1.0.0",
      description: `
        Full API documentation for the Freelancer Marketplace platform.
        Includes: Auth, Users, Categories, Projects, Bids, Milestones, Payments,
        Chat, Reviews, Analytics, and Admin Features.
      `,
    },
    servers: [
      {
        url: process.env.BASE_URL
          ? `${process.env.BASE_URL}`
          : "http://localhost:5000",
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },

  // Scan ALL API route files
  apis: ["./app/routes/api/*.js"],
};

// -----------------------------------------
// 2️⃣ Generate Swagger Spec
// -----------------------------------------
const swaggerSpec = swaggerJSDoc(options);



// -----------------------------------------
// 3️⃣ Export for app.js
// -----------------------------------------
module.exports = {
  swaggerUi,
  swaggerSpec,
};
