const db = require("../models");
const Blog = db.blog;
const TagBlog = db.tagblog;
const Tag = db.tag;
const Image = db.image;
const Op = db.Sequelize.Op;
const Sequelize = require("sequelize");
const validateHelper = require("../helpers/validate");
const imagesHelper = require("../helpers/images");
const localFileHelper = require("../helpers/localfile");
const wget = require('wget-improved');
const siteConfigs = require("../config/site.config.js");
const {charLimitObj} = require("../config/blog.config.js");
const fs = require('fs');
const awsService = require("../services/aws");
const userid = require("userid");

// The number of blog article summaries to display on the index page
const indexPaginationLimit = 5;

async function getBlogWithId(blogId, req, res) {
  let whereObj = {where: {id:blogId}};
  let blogObj = await Blog.findOne(whereObj);
  if (!blogObj) {
    res.render("pages/error", {error: "Not finding blog id: " + blogId});
    return false;
  }

  let tagObj = await getBlogTagData(blogId);
  let obj = {...blogObj.dataValues, ...tagObj};
  obj.charLimitObj = charLimitObj;
  obj.siteConfigs = siteConfigs;
  return obj;
}

// return an object of all tags - tagArr, tagIdAddedArr - only tag ids added to blog, tagNameAddedArr - only names added
async function getBlogTagData(blogId) {
  let tagIdAddedArr = await TagBlog.findAll({attributes: ['tagId'], where:{blogId:blogId}});
  let tagArr = await Tag.findAll({attributes: ['id','tag']});
  let obj = {};
  obj.tagArr = tagArr.map(obj => { return obj.dataValues });
  obj.tagIdAddedArr = tagIdAddedArr.map(obj => { return obj.dataValues.tagId });
  obj.tagNamesAddedArr = obj.tagArr.filter(tagObj => {
    return obj.tagIdAddedArr.includes(tagObj.id) ? tagObj.tag : false;
  });
  return obj;
}

exports.form = async (req,res) => {
  let blogObj = {};
  if (req.query.id) {
    const blogId = req.query.id;
    blogObj = await getBlogWithId(blogId, req, res);
    let message = '';
    if (req.query.undeploy == 1) {
      message = "You've made an edit to an already deployed blog. The blog has now been set to Deploy Ready, but remains in production. To make the edits live, Deploy again.";
    } else if (req.query.updated == 1) {
      message = "Updated!";
    }
    blogObj.message = message;
  } else {
    blogObj = {title:'', description:'', body:'', error:'', tags:'', id:0, deployed:0};
    blogObj.charLimitObj = charLimitObj;
    blogObj.siteConfigs = siteConfigs;
    blogObj.tagIdAddedArr = [];
    let tagArr = await Tag.findAll({attributes: ['id','tag']});
    blogObj.tagArr = tagArr.map(obj => { return obj.dataValues });
  }
  blogObj.linkTitle = convertStrToFilename(blogObj.title, '.html');
  return res.render('pages/blogform.ejs', blogObj);
}

// save blog
exports.submitform = async (req,res) => {

  let result = validateHelper.titleAndDescription(req.body.title, req.body.description);
  if (result !== true) {
    return renderFormWithError(result, req, res);
  }

  if (req.body.id != 0) {
    let blogId = req.body.id;
    let blogObj = await getBlogWithId(blogId, req, res);
    if (blogObj === false) {
      return;
    }
    // If they're submitting an already deployed blog, undeploy it
    let undeploy = 0;
    if (blogObj.deployed == 2) {
      req.body.deployed = 1;
      undeploy = 1;
    }
    try {
      await TagBlog.destroy({where: {blogId:blogId}});
      let tagIdArr = req.body.tagIdStr ? req.body.tagIdStr.split(",") : [];
      if (tagIdArr) {
        for(let i in tagIdArr) {
          let tagId = tagIdArr[i];
          await TagBlog.create({tagId:tagId, blogId:blogId});
        }
      }
    } catch(e) {
      return renderFormWithError(e, req, res);
    }

    Blog.update(req.body, {
      where: { id: blogId }
    })
    .then(arr => {
      if (arr[0] === 1) {
        res.redirect("/form?updated=1&id=" + blogObj.id + "&undeploy=" + undeploy);
      } else {
        let error = `Failed to update Blog with id=${blogId}.`;
        return renderFormWithError(error, req, res);
      }
    })
    .catch(err => {
      let error = "Error updating blog with id=" + blogId + ". " + err;
      return renderFormWithError(error, req, res);
    });

  } else {

    // Create a Blog
    const blog = {
      title: req.body.title,
      description: req.body.description
    };

    // Save Blog in the database
    Blog.create(blog)
      .then(data => {
        return res.redirect('/form?id=' + data.dataValues.id + '&saved=1');
      })
      .catch(err => {
        return renderFormWithError("Unknown error: " + err.message, req, res);
      });
  }

};

const getPagination = (page) => {
  let limit = 15;
  let offset = page ? page * limit : 0;
  return { limit, offset };
};

const getPagingData = (data, page) => {
  const { count: totalItems, rows: blogs } = data;
  const currentPage = page ? +page : 0;
  const {limit} = getPagination(0);
  const totalPages = Math.ceil(totalItems / limit);
  return { totalItems, blogs, totalPages, currentPage };
};

// Retrieve all Blogs or all of a users blogs from the database.
exports.findAll = async (req, res) => {
  // if coming here from redirect after deleted, 'deleted' will be set to 1
  const { page, size, searchTerm, deployed, deletedset } = req.query;
  const { limit, offset } = getPagination(page, size);
  let whereObj = {};
  if (searchTerm) {
    whereObj =  { title: { [Op.like]: `%${searchTerm}%` } };
  }
  if (deployed) {
    whereObj['deployed'] = deployed;
  }
  return new Promise(function(resolve, reject) {
    Blog.findAndCountAll({
      order: [[Sequelize.literal("blogs.createdAt"), 'DESC']],
      limit: limit,
      offset: offset,
      where: whereObj
      })
      .then(async function(data) {
        const response = getPagingData(data, page);
        if (deletedset) {
          response.message = 'Blog to be deleted next deployment';
        }
        if (searchTerm) {
          response.searchTerm = searchTerm;
        }
        response.blogs = setLinkTitles(response.blogs);
        response.siteConfigs = siteConfigs;
        res.render("pages/bloglist", response);
      })
      .catch(err => {
        res.render("pages/error", {
          error:
            err.message || "A.) Some error occurred while retrieving blogs."
        });
      });
  })
  .catch(err => {
    res.render("pages/error", {
      error:
        err.message || "B.) Some error occurred while retrieving blogs."
    });
  });
};

// Delete a Blog
exports.delete = async (req, res) => {

  const blogId = req.params.id;
  const deleteImages = req.query.delete_images ? req.query.delete_images : 0;
  let blogObj = await getBlogWithId(blogId, req, res);
  if (blogObj === false) {
    return res.render("pages/error", {error: "Blog not found. Could not delete Blog with id " + blogId + " : " + err});
  }

  try {
    await Blog.update({deleted:1,deleteImages:deleteImages}, {where:{id:blogId}});
  } catch(e) {
    return res.render("pages/error", {error: "Blog not found. Could not delete Blog with id " + blogId + " : " + err});
  }
  res.redirect("/?deletedset=1");

};

// Preview single blog article
exports.preview = async (req, res) => {
  const blogId = req.query.id;
  const isDeployment = typeof req.query.deploy !== 'undefined' ? req.query.deploy : 0;
  let blogObj = await getBlogWithId(blogId, req, res);
  if (!blogObj) {
    console.log("Not finding blog id: " + blogId);
    res.render("pages/error", {error: "Not finding blog id: " + blogId});
    return false;
  }
  console.log("display preview view", blogObj.title);
  blogObj.isDeployment = isDeployment;
  res.render("pages/preview", blogObj);
}

// View index listing of ARTICLES. Pass in ?page=0 or ?page=1 etc to view different pages
exports.index = async (req, res) => {

  let offset = typeof req.query.page !== 'undefined' ? parseInt(req.query.page) : 0;
  const isDeployment = typeof req.query.deploy !== 'undefined' ? req.query.deploy : 0;
  let deployed = 0;
  if (isDeployment) {
    deployed = 1;
  }
  console.log("blog.controller.index page", offset);
  try {
    // This endpoint is used for both deploying and previewing, so we want all ready for deployment or deployed thus gte 1
    let numPublished = await Blog.count({where: {deployed:{[Op.gte]:1}}});
    let numPages = Math.ceil(numPublished/indexPaginationLimit);
    let blogArr = await getBlogArr(offset, deployed, false, isDeployment);
    let tagArr = await getTagArr(deployed);
    res.render('pages/index', {isDeployment:isDeployment, arr:blogArr, tagArr:tagArr, page:offset, numPages:numPages, siteConfigs:siteConfigs, tag:false})
  } catch(e) {
    res.render('pages/index', { error: e.message, isDeployment:0, tagArr:[], arr:[], page:0, numPages:0, siteConfigs:siteConfigs, tag:false })
  };
}

// View index listing of TAGS. Pass in ?page=0 or ?page=1 etc to view different pages
exports.indextag = async (req, res) => {

  let offset = typeof req.query.page != 'undefined' ? parseInt(req.query.page) : 0;
  let tag = typeof req.query.tag !== 'undefined' ? req.query.tag : false;
  let tagId = typeof req.query.tag_id !== 'undefined' ? req.query.tag_id : false;
  let isDeployment = typeof req.query.deploy !== 'undefined' ? req.query.deploy : 0;
  let deployed = 0;
  if (isDeployment) {
    deployed = 1;
  }

  console.log("b.c.indextag tag", tag, "page", offset);

  try {
    if (!tagId || !tag) {
      let err = "tag and tag_id must both be passed in as part of the query string.";
      console.log("indextag", err);
      throw new Error(err);
    }
    let numBlogsWithTag = await TagBlog.count({
      where:{tagId:tagId},
      include: [{
        model: Blog,
        where: { deployed: {[Op.gte]:deployed}}
      }]
    });
    let numPages = Math.ceil(numBlogsWithTag/indexPaginationLimit);
    let blogArr = await getBlogArr(offset, deployed, tagId, isDeployment);
    let tagArr = await getTagArr(deployed);
    res.render('pages/index', {arr:blogArr, isDeployment:isDeployment, tagArr:tagArr, page:offset, numPages:numPages, siteConfigs:siteConfigs, tag:tag, tagId:tagId})
  } catch(e) {
    res.render('pages/index', { error: e.message, isDeployment:0, tagArr:[],arr:[], page:0, numPages:0, siteConfigs:siteConfigs, tag:"", tagId: 0 })
  };
}

// 1. Load (wget) all blog articles deployed > 0 and push them to s3 bucket
// 2. Build homepage with nav and push to s3
// 3. Build navigable tag index pages that lists all tagged blogs and push to s3
exports.deploy = async (req, res) => {

  if (!req.query.deploy) {
    getDeployedStatus().then(obj => {
      res.render('pages/deploy.ejs', obj);
    }).catch(e => {
      res.render('pages/deploy.ejs', {error:e.message});
    });
  } else {
    try {

      // Get all tags
      let tagArr = await Tag.findAll({raw:true, attributes: ['id','tag', 'deleted']});
      // Get all blog data and deploy as blog html articles to s3 where deployed >= 1
      // and delete from s3 where deployed=0
      let tmpBlogArr = await getBlogArr('all', 1, false, 1);
      let blogArr = [];
      for(let i in tmpBlogArr) {
        if (tmpBlogArr.deleted) {
          reallyDeleteBlog(tmpBlogArr[i]);
        } else {
          blogArr.push(tmpBlogArr[i]);
        }
      }

      let i = blogArr.length;
      console.log("XXXXXXXXXXXXXXXX building single article page data");
      while(i--) {
        // SINGLE ARTICLE
        let blogObj = blogArr[i];
        // deploy to s3 all blog articles where deployed >= 0
        let fileName = convertStrToFilename(blogObj.title, ".html");
        console.log("single article", fileName);
        let deployed = blogObj.deployed
        if (deployed > 0) {
          let url = siteConfigs.url + '/preview?deploy=1&id=' + blogObj.blogId;
          await downloadPageToLocalPublic(url, fileName);
          await awsService.uploadFileToS3(fileName);
        } else {
          // deployed is 0, so delete blog from s3 if it is there
          let fileExists = await awsService.fileExists(fileName);
          console.log("XXXXXXXXXXXXXXXX checking if fileName exists on s3 " + fileName, fileExists);
          if (fileExists) {
            await awsService.deleteFileFromS3(fileName);
            console.log("XXXXXXXXXXXXXXXX deleting from s3 " + fileName);
            blogArr.splice(i, 1);
          }
        }
      }
      console.log("single article creation done", blogArr.length);

      // ARTICLE LIST BY CREATION DATE
      // Build navigable listing of blog articles ordered by date and deploy to s3
      let numPages = Math.ceil(blogArr.length / indexPaginationLimit);
      console.log("XXXXXXXXXXXXXXXX building article index html. numPages ", numPages);
      for (let i = 0; i < numPages; i++) {
        let url = siteConfigs.url + '/index?deploy=1&page=' + i;
        let pageNum = i == 0 ? "" : i;
        let fileName = 'index' + pageNum + '.html';
        console.log("article list by creation date", fileName, url);
        await downloadPageToLocalPublic(url, fileName);
        await awsService.uploadFileToS3(fileName);
      }

      // ARTICLE LIST BY TAG
      // Build navigable listing of blog articles grouped by tag
      // deploy to s3
      console.log("XXXXXXXXXXXXXXXX building article data by tags");
      let tagId = 0;
      let tag = '';
      let deleteTag = 0;
      // Loop over tags and get count of number of blogs with tag
      for(let i in tagArr) {
        tagId = tagArr[i].id;
        tag = tagArr[i].tag;
        deleteTag = tagArr[i].deleted;
        let numBlogsWithTag = await TagBlog.count({
          where:{tagId:tagId},
          include: [{
            model: Blog,
            where: {deployed:{[Op.gte]:1}}
          }]
        });

        // If there are no blogs with tag, skip unless tag is set to be deleted
        if (numBlogsWithTag === 0 && !deleteTag) {
          continue;
        }
        // Blogs may have been untagged, but there may be html files in the format tag.html, tag1.html, etc
        if (numBlogsWithTag === 0 && deleteTag) {
          let index = 0;
          let fileExists;
          do {
            let fileName = convertToHTMLFile(tag, index);
            fileExists = await awsService.fileExists(fileName);
            if (fileExists) {
              await mngDeleteTag(fileName, tagId);
            }
            index++;
          } while(index == 0);
          continue;
        }

        // Make navigable index pages that are tag names (eg. aws.html, nodejs.html) and list all articles tagged accordingly
        let numPages = Math.ceil(numBlogsWithTag / indexPaginationLimit);
        console.log("XXXXXXXXXXXXXXXX building index html pages for tags. numPages", numPages);
        for (let j = 0; j < numPages; j++) {
          let fileName = convertToHTMLFile(tag, j);
          console.log("index list tags", fileName);
          if (deleteTag) {
            await mngDeleteTag(fileName, tagId)
          } else {
            let url = siteConfigs.url + '/indextag?deploy=1&page=' + j + '&tag=' + tag + '&tag_id=' + tagId;

            await downloadPageToLocalPublic(url, fileName);
            await awsService.uploadFileToS3(fileName);
          }
        }
      }

      // deploy css
      await awsService.uploadFileToS3("css/prodStyle.css", "", "text/css");
      // deploy images in public/img
      let imgArr = await imagesHelper.readLocalPublicImgDir('/var/app/current/public/img')
      for(let i in imgArr) {
        let imgName = imgArr[i];
        await awsService.uploadFileToS3("img/" + imgName, "", "");
      };
      await Blog.update({deployed:2}, {where: { deployed: 1}})
      let obj = await getDeployedStatus();
      obj.message = "All deployed blogs now accessible via the homepage, navigation and search.";
      res.render('pages/deploy.ejs', obj);
    } catch(e) {
      res.render('pages/deploy.ejs', {error: "Error deploying: " + e.message, numEditMode:0, numDeployReady:0, numDeployed:0});
    }
  }
}

function reallyDeleteBlog(blogObj) {

  let blogId = blogObj.id;
  let deleteImages = blogObj.deleteImages;
  let imgStr = '';
  let promiseArr = [];
  Blog.destroy({where: {id:blogId}})
  .then(async num => {
    if (num === 1) {
      let imageArr = await Image.findAll({where:{blogId:blogId}});
      if (deleteImages && imageArr.length) {
        promiseArr.push(Image.destroy({where:{blogId:blogId}}));
        for(let i in imageArr) {
          let imageObj = imageArr[i];
          imgStr = '/img/' + imageObj.id + '.' + imageObj.ext;
          let imgStrThumb = '/img/' + imageObj.id + '_thumb.' + imageObj.ext;
          promiseArr.push(imagesHelper.deleteLocalImageThumb(imgStrThumb));
          promiseArr.push(imagesHelper.deleteLocalImage(imgStr));
          if (blogObj.deployed === 2) {
            promiseArr.push(awsService.deleteFileFromS3(imgStr));
            promiseArr.push(awsService.deleteFileFromS3(imgStrThumb));
          }
        }
      }
      let htmlFile = convertToHTMLFile(blogObj.title);
      let existsLocally = await localFileHelper.localPublicFileExists(htmlFile);
      if (existsLocally) {
        promiseArr.push(localFileHelper.deleteFileFromLocalPublic(htmlFile));
      }
      promiseArr.push(TagBlog.destroy({where:{blogId:blogId}}));
      Promise.all(promiseArr)
      .then((r) => {
        return true;
      }).catch(error => {
        console.error(error.message);
        return false;
      });
    }
  });
}

function getTagArr(deployed) {
  return new Promise(async (resolve, reject) => {
    console.log("getTagArr");
    try {
      let tagArr = await Tag.findAll({
        raw:true,
        attributes: ['id','tag'],
        include: [{
          raw:true,
          model: db.tagblog,
          where: {blogId: {[Op.ne]: null}},
          attributes: ['blogId']
        }]
      });
      // Group by with blogId has issues, so making uniques with node
      let uniqueTagArr = [];
      let idsSetArr = [];
      for(let i in tagArr) {
        if (!idsSetArr.includes(tagArr[i].id)) {
          uniqueTagArr.push(tagArr[i]);
          idsSetArr.push(tagArr[i].id);
        }
      }

      let i = uniqueTagArr.length
      while(i--) {
        // if deploying to s3, only deploy those tags that are associated with blogs that have blogs.deployed>=1
        if (deployed) {
          let obj = uniqueTagArr[i];
          let blogId = obj['tagsblogs.blogId'];
          let hasDeployReadyBlog = await Blog.count({where: {id:blogId, deployed: { [Op.gte]: 1}}});
          if (!hasDeployReadyBlog) {
            uniqueTagArr.splice(i, 1);
            continue;
          }
        }
        uniqueTagArr[i].htmlfilename = convertStrToFilename(uniqueTagArr[i].tag, '.html');
      }
      return resolve(uniqueTagArr);
    } catch(e) {
      reject(e);
    }
  });
}

function getDeployedStatus() {
  let numEditModePromise = Blog.count({where: {deployed:0}});
  let numDeployReadyPromise = Blog.count({where: {deployed:1}});
  let numDeployedPromise = Blog.count({where: {deployed:2}});
  return Promise.all([numEditModePromise, numDeployReadyPromise, numDeployedPromise]).then((arr) => {
    return {numEditMode:arr[0], numDeployReady:arr[1], numDeployed:arr[2]};
  });
}

async function mngDeleteTag(fileName, tagId) {
  return new Promise(async (resolve, reject) => {
    try {
      await awsService.deleteFileFromS3(fileName);
      await localFileHelper.deleteFileFromLocalPublic(fileName);
      await TagBlog.destroy({where:{tagId:tagId}});
      await Tag.destroy({where:{id:tagId}});
      resolve();
    } catch(e) {
      reject (e);
    }
  });
}

function convertToHTMLFile(str, pageNum) {
  pageNum = pageNum ? pageNum : "";
  let fileName = convertStrToFilename(str + pageNum, '.html');
  return fileName;
}

function convertStrToFilename(title, ext) {
  let r = title.trim().replace(/[\s:;,_]+/g, '-').toLowerCase();
  // only ascii characters
  r = r.replace(/[^\x00-\x7F]/g, "");
  r = r + ext;
  return r;
}

function setLinkTitles(blogArr) {
  for(let i in blogArr) {
    if (blogArr[i].dataValues.title) {
      blogArr[i].dataValues['linkTitle'] = convertStrToFilename(blogArr[i].dataValues.title, '.html');
    }
  }
  return blogArr;
}

// url = full url eg 'http://nodejs.org/images/logo.svg';
function downloadPageToTmp(url, fileName) {
  return new Promise(function(resolve, reject) {
    const output = '/tmp/' + fileName;
    let download = wget.download(url, output);
    download.on('error', function(err) {
      return reject(err);
    });
    download.on('end', function(output) {
      return resolve();
    });
  });

}

// url = full url eg 'http://nodejs.org/images/logo.svg';
function downloadPageToLocalPublic(url, fileName) {
  return new Promise(function(resolve, reject) {
    console.log("inside downloadPageToLocalPublic start", fileName);
    const output = '/var/app/current/public/' + fileName;
    let download = wget.download(url, output);
    download.on('error', function(err) {
      return reject(err);
    });
    download.on('end', function(result) {
      console.log("inside downloadPageToLocalPublic end", fileName);
      let wwwDataId = userid.uid("www-data");
      fs.chown( output, wwwDataId, wwwDataId, (err) => {
        console.log("inside downloadPageToLocalPublic chown", fileName);
        if (err) {
          return reject(err);
        }
        return resolve(output + " saved to public dir");
      });
    });
  });
}

const getBlogArr = (offset, deployed, tagId, isDeployment) => {
  //console.log("getBlogArr args", offset, deployed, tagId, isDeployment);
  let limit = 5;
  tagId = typeof tagId === 'undefined' ? false : tagId;
  // When deploying, only get articles that have a deployed status of 1 as deployed status of 2 means it is already
  // deployed. Preview needs both deployed status of 1 or 2 to be retrieved
  isDeployment = typeof isDeployment !== 'undefined' ? isDeployment : 0;
  deployed = typeof deployed !== 'undefined' ? deployed : 0;
  let options = {};
  //if (isDeployment == 1) {
  //  options = {where: {deployed:deployed}};
 // } else {
    options = {where: {deployed:{[Op.gte]:deployed}}};
  //}
  options.include = [];
  if (tagId) {
    options.include.push({
      model: TagBlog,
      where: { tagId: tagId}
    });
  }
  options.order = [[Sequelize.literal("blogs.createdAt"), 'DESC']]
  // options.include.push({
  //   model: db.user,
  //   attributes: {
  //     include: ['username', 'name']
  //   }
  // });
  if (offset !== 'all') {
    options.limit = limit;
    options.offset = (offset * limit);
  }
  //console.log("getBlogArr options", options);

  return new Promise((resolve, reject) => {
    // get all the blogs
    Blog.findAll(options)
    .then(async function(data) {
      // build array or needed data
      let arr = [];
      try {
        for(let i = 0; i < data.length; i++) {
          let tmp = data[i].dataValues;
          let blogId = tmp.id;
          let tagObj = await getBlogTagData(blogId);
          arr[i] = tagObj;
          arr[i].blogId = blogId;
          arr[i].title = tmp.title;
          arr[i].linkTitle = convertStrToFilename(tmp.title, '.html');
          arr[i].description = tmp.description;
          // arr[i].userId = tmp.userId;
          // arr[i].username = tmp.user.username;
          // arr[i].name = tmp.user.name;
          arr[i].tags = tmp.tags;
          arr[i].updatedAt = tmp.updatedAt;
          arr[i].createdAt = tmp.createdAt;
          arr[i].deployed = tmp.deployed;
          let imageId = tmp.imageId;
          if (imageId) {
            let imageArr = await Image.findAll({raw: true, where:{id:imageId}});
            arr[i].thumbnail = "/img/" + imageId + "_thumb." + imageArr[0].ext;
          } else {
            arr[i].thumbail = '';
          }
        }
        resolve(arr);
      } catch(e) {
        reject(e);
      }
    }).catch(err => {
      reject({message:err.message || "Some error occurred while retrieving blogs."});
    });

  });

}

function renderFormWithError (error, req, res) {
  res.render('pages/blogform.ejs', {
    error: error,
    title: req.body.title,
    description:req.body.description,
    body:req.body.body,
    tags:req.body.tags,
    id:0,
    deployed:0,
    charLimitObj:charLimitObj,
    siteConfigs:siteConfigs
  });
}
