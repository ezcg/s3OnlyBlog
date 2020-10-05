const express = require("express");
const bodyParser = require("body-parser");
global.logger = require('./services/logger');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser'); // module for parsing cookies

// Cookie parser must be set up before the routes as routes will read cookies
app.use(cookieParser());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});

// routes
require("./routes/blog.routes")(app);
require('./routes/auth.routes')(app);
require('./routes/tag.routes')(app);
require('./routes/image.routes')(app);
require('./routes/tmp.routes')(app);

// log requests
app.use(function(req, res, next) {
  if (req.method === 'OPTIONS') {
    next();
  }
  let str = req.method + " " + req.originalUrl + " ";
  if (req.method === 'GET' && Object.values(req.query).length) {
    str+= JSON.stringify(req.query);
  } else if (Object.values(req.body).length && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')){
    let dataArr = {};
    for(let i in req.body) {
      let value = req.body[i];
      if (value.length > 400) {
        value = value.substr(0,400) + " __TRUNCATED__";
      }
      dataArr[i] = value;
    }
    str+= JSON.stringify(dataArr);
  }
  logger.info(str);
  next();
});

// serve all the static files in the /public directory in the project root.
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// simple route
app.get("/test", (req, res, next) => {
  res.render('pages/body', { title: 'Hey', body: 'Hello from server.js!' })
});

// set port, listen for requests
const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  logger.log('info',`Server is running on port ${PORT}.`);
  logger.log('info',`Environment is ${process.env.ENVIRONMENT}.`);
});

process.on('uncaughtException', function (err) {
  logger.error((new Date).toUTCString() + ' uncaughtException:', err.message)
  logger.error(err.stack)
})

process.on('warning', e => console.warn(e.stack));
