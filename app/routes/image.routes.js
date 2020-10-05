var multer  = require('multer')
var upload = multer({ dest: '/var/app/current/tmp/' })

module.exports = app => {

  const imageController = require("../controllers/image.controller.js");

  let router = require("express").Router();

  // IMAGES

  // Submit image form
  router.post("/uploadimages",  upload.array('files', 30), imageController.uploadimages);

  // Retrieve all images specific to blog article
  router.get("/", imageController.findBlogSpecificImages);

  // Retrieve all images and return json
  router.get("/all", imageController.findAll);

  // Display gallery page
  router.get("/gallery", imageController.gallery);

  router.get("/delete", imageController.delete);


  app.use('/images', router);

};
