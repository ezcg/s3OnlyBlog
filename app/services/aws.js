const AWS = require('aws-sdk');
const awsConfigs = require("../config/aws.config.js");
const fs = require('fs');

const s3 = new AWS.S3({
  accessKeyId: awsConfigs.ID,
  secretAccessKey: awsConfigs.SECRET
});

exports.fileExists = (fileName, s3Path) => {
  return new Promise(async(resolve, reject) => {
    try {
      s3Path = setS3Path(s3Path);
      let params = {
        Bucket: awsConfigs.BUCKET_NAME,
        Key: s3Path + fileName,
      }
      await s3.headObject(params).promise();
      return resolve(true);
    } catch (e) {
      if (e.code === 'NotFound') {
        return resolve(false);
      }
    }
  });
}

// s3Path should be in the form /path/to/file/with/ending/slash/ or an empty string
exports.uploadFileToS3 = (fileName, s3Path, contentType) => {

  return new Promise((resolve, reject) => {
    contentType = typeof contentType === 'undefined' ? 'text/html' : contentType;
    s3Path = setS3Path(s3Path);
    const fileContent = fs.readFileSync("/var/app/current/public/" + fileName);
    const params = {
      Bucket: awsConfigs.BUCKET_NAME,
      Key: s3Path + fileName,
      Body: fileContent,
      ContentType: contentType
    };
    s3.upload(params, function(err, data) {
      if (err) {
        logger.error("uploadFileToS3 ", JSON.stringify(err));
        reject(err);
      }
      console.log("uploadFileToS3 uploaded", fileName);
      resolve(data);
    });
  });
};

// s3Path should be in the form /path/to/file/with/ending/slash/
exports.deleteFileFromS3 = (fileName, s3Path) => {
  return new Promise((resolve, reject) => {
    s3Path = setS3Path(s3Path);
    const params = {
      Bucket: awsConfigs.BUCKET_NAME,
      Key: s3Path + fileName
    };
    s3.deleteObject(params, function(err, data) {
      if (err) {
        logger.error("deleteFileFromS3 ", JSON.stringify(err));
        reject(err);
      } else {
        console.log("deleteFileFromS3 deleted", fileName);
        resolve(true);
      }
    });
  });
}

function setS3Path(path) {
  if (typeof path === 'undefined') {
    return "";
  }
  if (path && path.charAt(0) !== '/') {
    path = '/' + path;
  }
  if (path && path.charAt(path.length) !== '/') {
    path = path + '/';
  }
  return path;
}
