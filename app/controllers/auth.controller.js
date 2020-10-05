const db = require("../models");
const User = db.user;
let jwt = require("jsonwebtoken");
const roles = require("../config/roles.config");

const google = require('googleapis').google;

// Google's OAuth2 client
const OAuth2 = google.auth.OAuth2;

const config = require("../config/auth.config");
/*
 For use with google Oauth2.
 Create user if not found and/or sign user in and return bearer token.
 */
function signin(data) {

  return new Promise(function(resolve, reject) {

    let user = {};
    User.findOne({raw:true,
      where: {
        googleId: data.id
      }
    })
      .then(async user => {
        if (!user) {
          let username = data.name.replace(/[^\x00-\x7F]/g, "");
          username = username.replace(/ /g, "_");
          user = await User.create({
            username: username,
            name:data.name,
            imageUrl:data.imageUrl,
            googleId:data.id,
            role:1
          })
          .catch(err => {
            return reject( err.message);
          });
        }

        let token = jwt.sign({ id: user.id }, config.JWTsecret, {
          expiresIn: (86400 * 360)
        });

        let authorities = [];
        for(let roleName in roles) {
          let role = roles[roleName];
          if ((role & user.role) === role) {
            authorities.push("ROLE_" + roleName.toUpperCase());
          }
        }

        return resolve({
            id: user.id,
            username: user.username,
            name: user.name,
            roles: authorities,
            accessToken: token
          });

      })
      .catch(err => {
        return reject(err.message);
      });

  });

};

exports.callback = (req, res) => {

  // Create an OAuth2 client object from the credentials in our config file
  const oauth2Client = new OAuth2(
    config.oauth2Credentials.client_id,
    config.oauth2Credentials.client_secret,
    config.oauth2Credentials.redirect_uris[0]
  );

  if (req.query.error) {
    // The user did not give us permission.
    console.log("req.query.error", req);
    return res.redirect('/');
  } else {

    oauth2Client.getToken(req.query.code, function(err, token) {
      if (err) {
        console.log("oauth2Client.getToken err", req);
        return res.redirect('/');
      }
      oauth2Client.setCredentials({access_token: token.access_token});
      let oauth2 = google.oauth2({auth: oauth2Client, version: 'v2'});
      oauth2.userinfo.get(
        async function(err, resoauth2) {
          if (err) {
            console.log("oauth2.userinfo.get", err);
          } else {
            console.log("resoauth2.data", resoauth2.data);
            try {
              let userObj = await signin(resoauth2.data);
              res.cookie('x-access-token', userObj.accessToken);
              res.cookie('username', userObj.name);
              res.cookie('jwt', jwt.sign(token, config.JWTsecret));
              return res.redirect('/');
            } catch(e) {
              console.log("jwt.verify error", e);
            }
          }
        });

    });
  }

};
