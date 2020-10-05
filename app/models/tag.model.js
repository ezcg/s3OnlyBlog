module.exports = (sequelize, Sequelize) => {
  const Tag = sequelize.define("tag", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tag: {
      type: Sequelize.STRING,
      unique: true
    },
    deleted: {
      type: Sequelize.INTEGER,
      unique: true
    }
  });
  return Tag;
};
