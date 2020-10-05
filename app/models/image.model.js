module.exports = (sequelize, Sequelize) => {
  const Image = sequelize.define("image", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    width: {
      type: Sequelize.INTEGER
    },
    height: {
      type: Sequelize.INTEGER
    },
    blogId: {
      type: Sequelize.INTEGER
    },
    ext: {
      type: Sequelize.STRING
    }
  });
  return Image;
};
