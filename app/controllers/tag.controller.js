const db = require("../models");
const Tag = db.tag;
const Op = db.Sequelize.Op;
const Sequelize = require("sequelize");
const validateHelper = require("../helpers/validate");
const siteConfigs = require("../config/site.config.js");
const {charLimitObj} = require("../config/blog.config.js");
const fs = require('fs');
const awsService = require("../services/aws");

// save tag
exports.submitform = async (req,res) => {

  try {
    if (req.body.action === 'add') {
      let tag = validateHelper.cleanTag(req.body.tag);
      const tagObj = {
        tag: tag
      };
      await Tag.findOrCreate({where:tagObj});
    } else {
      let tagIdArr = req.body.tagIdArr;
      let tagArr = req.body.tagArr;
      let tagDeleteIdArr = typeof req.body.tagDeleteIdArr === 'undefined' ? [] : req.body.tagDeleteIdArr;
      for(let i in tagArr) {
        let tag = validateHelper.cleanTag(tagArr[i]);
        let tagId = tagIdArr[i];
        if (!tagDeleteIdArr.includes(tagId)) {
          await Tag.update({tag:tag}, {where: { id: tagId }});
        } else {
          //await Tag.destroy({where: {id:tagDeleteIdArr[i]}});
          // Set to be deleted with next deployment to avoid broken pages/links in prod
          await Tag.update({deleted:1}, {where: { id: tagId }});

        }
      }
    }
  }catch(err) {
    let error = "Error updating tag: " + err;
    return renderFormWithError(error, req, res);
  };

  return res.redirect('/tags?saved=1');

};

// Retrieve all tags
exports.findAll = async (req, res) => {

  // if coming here from redirect after deleted, 'deleted' will be set to 1
  const { saved, deleted } = req.query;

  Tag.findAll({
    raw:true,
    order: [[Sequelize.literal("tag.createdAt"), 'DESC']]
  })
  .then(async function(dataArr) {
    let response = {};
    response.tagArr = [];
    for(let i in dataArr) {
      response.tagArr.push({id:dataArr[i].id, tag:dataArr[i].tag, deleted:dataArr[i].deleted});
    }
    if (deleted) {
      response.message = 'Deleted!';
    }else if (saved) {
      response.message = 'Saved!';
    }
    response.siteConfigs = siteConfigs;
    response.charLimitObj = charLimitObj;
    res.render("pages/tag", response);
  })
  .catch(err => {
    res.render("pages/error", {
      error:
        err.message || "A.) Some error occurred while retrieving tags."
    });
  });

};

function renderFormWithError (error, req, res) {
  let rObj = {
    error: error,
    tag: req.body.tag,
    tagArr: req.body.tagArr,
    tagIdArr: req.body.tagIdArr,
    tagDeleteIdArr: req.body.tagDeleteIdArr,
    siteConfigs: siteConfigs,
    charLimitObj: charLimitObj
  }
  res.render('pages/tag', rObj);
}
