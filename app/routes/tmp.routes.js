module.exports = app => {

  const tmpController = require("../controllers/tmp.controller.js");

  let router = require("express").Router();

  router.get("/", tmpController.index);

  app.use('/tmp', router);

};
