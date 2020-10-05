const { authJwt } = require("../middleware");

module.exports = app => {

  const blogController = require("../controllers/blog.controller.js");

  var router = require("express").Router();

  // BLOG

  // Create a new blog
  router.get("/form", blogController.form);
  // Edit blog
  router.post("/submitform", blogController.submitform);

  // Retrieve all Blogs
  router.get("/", blogController.findAll);

  // Preview html view before deploying.
  // Can't use jwt as this is called with wget
  router.get("/preview", blogController.preview);

  // Hompage
  router.get("/index", blogController.index);

  // Articles by tag
  router.get("/indextag", blogController.indextag);

  // Push all published blogs json to s3 so that is it accessible via the main public categories list
  router.get("/deploy", blogController.deploy);

  // Retrieve a single Blog with id
  //router.get("/:id", blogController.findOne);

  // Delete a Blog with id
  router.get("/delete/:id", blogController.delete);

  app.use('/', router);

};
