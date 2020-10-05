const db = require("../models");
const Op = db.Sequelize.Op;
const Sequelize = require("sequelize");
const Image = db.image;
const Blog = db.blog;
// const validateHelper = require("../helpers/validate");
// const siteConfigs = require("../config/site.config.js");
// const {charLimitObj} = require("../config/blog.config.js");
const sizeOf = require('image-size');
var fs = require('fs');
const imageThumbnail = require('image-thumbnail');
const awsService = require("../services/aws");
const imagesHelper = require("../helpers/images");

exports.uploadimages = async (req, res) => {

  try {
    let filesArr = req.files;
    let validMimeTypeArr = ['image/jpg','image/jpeg','image/gif', 'image/png'];
    for (let i in filesArr) {
      let imgObj = filesArr[i];
      if (!validMimeTypeArr.includes(imgObj.mimetype)) {
        throw new Error('Invalid image type: ' + imgObj.mimetype);
      }
    }
    let blogId = req.query.id;
    let imageArr = [];
    for (let i in filesArr) {
      let imgObj = filesArr[i];
      let dimensions = sizeOf(imgObj.path);
      let ext = imgObj.mimetype.replace("image/", "");
      // the 'blogId' in the images table is for the blog thumbnail image
      let r = await Image.create({height:dimensions.height, width:dimensions.width, ext:ext});
      let obj = {}
      obj.width = dimensions.width;
      obj.height = dimensions.height;
      obj.ext = ext;
      obj.id = r.id;
      obj.path = imgObj.path;
      obj.imageName = '/var/app/current/public/img/' + obj.id + "." + obj.ext;
      obj.imageThumbnailName = '/var/app/current/public/img/' + obj.id + "_thumb." + obj.ext;
      imageArr.push(obj);
    }
    for(let i in imageArr) {
      let obj = imageArr[i];
      // copy file from upload dir /var/app/current/tmp to public/img and rename at the same time
      fs.rename(obj.path, obj.imageName , async function (err) {
        if (err) {
          throw new Error('Failed to rename image to ' + obj.imageName + " " + err.message);
        }

        let width = 100;
        let height = 100;
        // If image is not a square, make the shorter thumb dimension 100
        if (obj.height != obj.width) {
          let ratioHeight = (1 / obj.height * 100);
          let ratioWidth = (1/obj.width * 100);
          if (ratioWidth > ratioHeight) {
            height = parseInt(ratioWidth * obj.height);
          } else {
            width = parseInt(ratioHeight * obj.width);
          }
        }
        // Create a thumbnail from the original image and write it to the filesystem with a '_thumb'.ext
        try {
          let options = { width: width, height: height}
           imageThumbnail(obj.imageName, options)
            .then(thumbnail => {
              fs.writeFile(obj.imageThumbnailName, thumbnail, function (err) {
                if (err) {
                  throw new Error('Failed to resize image ' + obj.imageName + ' to thumbnail ' + obj.imageThumbnailName + ' ' + err.message);
                }
                if (i == filesArr.length - 1) {
                  return res.status(200).send({message:'done'});
                }
              });
            })
        } catch (err) {
          throw new Error('Failed to create thumbnail ' + obj.imageThumbnailName + " " + err.message);
        }

      });
    }

  } catch (err) {
    return res.status(400).send({error:err.message});
  }

}

exports.findBlogSpecificImages = async (req, res) => {

  let blogId = req.query.blog_id;
  let imageArr = [];
  let r = await Image.findAll({where:{blogId:blogId}}, {raw:true,
    order: [[Sequelize.literal("image.createdAt"), 'DESC']]
  });
  let idAddedArr = [];
  for(let i in r) {
    imageArr.push(r[i]);
    idAddedArr.push(r[i].id);
  }
  // Add the remaining images to the end
  r = await Image.findAll({raw:true,
    order: [[Sequelize.literal("image.createdAt"), 'DESC']],
  });
  for(let i in r) {
    if (!idAddedArr.includes(r[i].id)) {
      imageArr.push(r[i]);
    }
  }

  let json = JSON.stringify(imageArr);
  return res.status(200).send(json);

}

exports.findAll = async (req, res) => {

  let offset = parseInt(req.query.offset);
  let limit = parseInt(req.query.limit);
  let imageArr = [];
  let r = await Image.findAll({raw:true,
    order: [[Sequelize.literal("image.createdAt"), 'DESC']],
    limit: limit,
    offset: offset,
  });
  for(let i in r) {
    imageArr.push(r[i]);
  }
  let json = JSON.stringify(imageArr);
  return res.status(200).send(json);

}

exports.delete = async (req, res) => {

  try {
    let promiseArr = [];
    let idArr = req.query.del.split("-");
    let imageIsUsedByBlogArr = [];
    for(let i in idArr) {
      let id = idArr[i];
      let imageIsUsedByBlog = false;
      let r = await Image.findAll({raw:true, where:{id:id}});
      let imgStr = '';
      let imgStrThumb = '';
      if (r.length) {
        let blogId = r[0].blogId;
        imgStr = '/img/' + id + '.' + r[0].ext;
        imgStrThumb = '/img/' + id + '_thumb.' + r[0].ext;
        imageIsUsedByBlog = await Blog.count({where:{id:blogId, body: { [Op.like]: `%${imgStr}%` }}});
        if (imageIsUsedByBlog) {
          imageIsUsedByBlogArr.push({blogId:blogId, imgSrc:imgStrThumb});
        } else {
          promiseArr.push(imagesHelper.deleteLocalImage(imgStr));
          promiseArr.push(imagesHelper.deleteLocalImageThumb(imgStrThumb));
          promiseArr.push(Image.destroy({where:{id:id}}));
          promiseArr.push(awsService.deleteFileFromS3(imgStr));
          promiseArr.push(awsService.deleteFileFromS3(imgStrThumb));
        }
      }
    }

    Promise.all(promiseArr)
    .then((r) => {
      res.status(200).send(JSON.stringify(imageIsUsedByBlogArr));
    }).catch(function(err) {
      res.status(400).send(JSON.stringify(err.message));
    });

  } catch(e) {
    return res.status(400).send(e.message);
  }
}


exports.gallery = (req, res) => {
  res.render('pages/imagegallery.ejs');
}
