const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Roles = require("../config/roles.config.js");

verifyToken = (req, res, next) => {

  let token = req.cookies['x-access-token'];

  if (!token) {
    return res.render("pages/error", {message: "Not logged in, no token provided."});
  }

  jwt.verify(token, config.JWTsecret, async (err, decoded) => {
    if (err) {
      return res.render("pages/error", {
        message: "Unauthorized!"
      });
    }
    req.validatedUserId = decoded.id;
    let userObj = await User.findOne({where:{ id: req.validatedUserId}});
    if (!userObj.dataValues) {
      return res.render("pages/error", {message: "Did not find a row in users table with userId:" + req.validatedUserId});
    } else {
      req.validatedAccessLevel = userObj.role;
      if (req.validatedAccessLevel === 0) {
        return res.render("pages/error", {message: "You no longer have access to anything because you have been banned."});
      } else {
        next();
      }
    }
  });

};

const authJwt = {
  verifyToken: verifyToken
}
module.exports = authJwt;
