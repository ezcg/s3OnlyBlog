const { authJwt } = require("../middleware");

module.exports = app => {

  const tagController = require("../controllers/tag.controller.js");

  let router = require("express").Router();

  // TAGS

  // Submit tag form
  router.post("/submitform", tagController.submitform);

  // Retrieve all tags
  router.get("/", tagController.findAll);

  app.use('/tags', router);

};
