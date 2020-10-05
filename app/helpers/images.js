var fs = require('fs');

exports.deleteLocalImage = function(imgStr) {
  return new Promise((resolve,reject) => {
    fs.unlink('/var/app/current/public' + imgStr, async (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

exports.deleteLocalImageThumb = function(imgStrThumb) {
  return new Promise((resolve,reject) => {
    fs.unlink('/var/app/current/public' + imgStrThumb, async (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

exports.readLocalPublicImgDir = function(path) {
  return new Promise((resolve,reject) => {
    fs.readdir(path, function (err, fileArr) {
      if (err) {
        reject('readLocalPublicImgDir fail: ' + err);
      }
      resolve (fileArr);
    });
  });
}
