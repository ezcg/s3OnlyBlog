const {charLimitObj} = require("../config/blog.config.js");

// Title is created first to generate and id
exports.titleAndDescription = function(title, description) {

  // Validate request
  if (!title || !description) {
    return "Title and description required"
  }

  if (title.length > charLimitObj.maxCharsTitle || description.length > charLimitObj.maxCharsDescription) {
   return "Title cannot be longer than " + charLimitObj.maxCharsTitle + " characters and description cannot be longer than " + maxCharsDescription + " characters.";
  } else if (title.length < charLimitObj.minCharsTitle || description.length < charLimitObj.minCharsDescription) {
   return "Title cannot be shorter than " + charLimitObj.minCharsTitle + " characters and description cannot be shorter than " + charLimitObj.minCharsDescription + " characters.";
  }

  return true;

}

exports.cleanTag = function(tag) {
  // remove non-alphanumerics
  let r = tag.trim().replace(/[^a-zA-Z0-9]+/g, '');
  // only ascii characters
  r = r.replace(/[^\x00-\x7F]/g, "");
  return r;

}
