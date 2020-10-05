const fs = require('fs');

// Json encode 'data' if need be
exports.writeFileToTmp = (fileContent, fileName) => {
  return new Promise((resolve, reject) => {
    fs.writeFile("/tmp/" + fileName, fileContent, async function(err) {
      if(err) {
        let message = "Error writing " + fileName + " to local /tmp and did not push it to s3. " + err.message;
        logger.error("writeFileToTmp ", JSON.stringify(err));
        reject({message: message});
      } else {
        resolve("Wrote to tmp", fileName);
      }
    });
  });
}

exports.readFileFromLocalPublic = (fileName) => {
  return new Promise((resolve, reject) => {
    try {
      let json = fs.readFileSync("/var/app/current/public/" + fileName);
      return resolve(JSON.parse(json));
    }catch(e) {
      return reject(JSON.stringify(e));
    }
  });
}

exports.writeFileToLocalPublic = (fileContent, fileName) => {
  return new Promise((resolve, reject) => {
    fs.writeFileSync("/var/app/current/public/" + fileName, fileContent, (err) => {
      if (err) {
        logger.error("writeFileToLocalPublic ", JSON.stringify(err));
      }
      console.log("writeFileToLocalPublic wrote", fileName);
      resolve();
    });
  });
}

exports.deleteFileFromLocalPublic = (fileName) => {
  return new Promise((resolve, reject) => {
    fs.unlink("/var/app/current/public/" + fileName, (err) => {
      if (err) {
        logger.error("deleteFileFromLocalPublic ", JSON.stringify(err));
        reject(err);
      }
      console.log("deleteFileFromLocalPublic deleted", fileName);
      resolve();
    });
  });
}

exports.localPublicFileExists = (fileName) => {

  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync("/var/app/current/public/" + fileName)) {
        return resolve (true);
      }
      return resolve(false);
    }catch(e) {
      return reject(JSON.stringify(e));
    }
  });

}
