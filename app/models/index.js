const dbConfig = require("../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.db, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  dialect: dbConfig.dialect,
  operatorsAliases: 0,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.blog = require("./blog.model.js")(sequelize, Sequelize);
db.image = require("../models/image.model.js")(sequelize, Sequelize);
db.tag = require("../models/tag.model.js")(sequelize, Sequelize);
db.tagblog = require("../models/tagblog.model.js")(sequelize, Sequelize);

db.tag.hasMany(db.tagblog, {
  foreignKey: "tagId"
});
db.tagblog.belongsTo(db.tag);

db.blog.hasMany(db.tagblog, {
  foreignKey: "blogId"
});
db.tagblog.belongsTo(db.blog);

// May not want to delete thumbnail image
// db.blog.hasMany(db.image, {
//   foreignKey: "blogId"
// });
// db.image.belongsTo(db.blog);


module.exports = db;
