module.exports = (sequelize, Sequelize) => {
  const Blogs = sequelize.define("blogs", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING
    },
    description: {
      type: Sequelize.STRING
    },
    body: {
      type: Sequelize.STRING
    },
    deployed: {
      type: Sequelize.INTEGER
    },
    imageId: {
      type: Sequelize.INTEGER
    },
    deleted: {
      type: Sequelize.INTEGER
    }
  });
  return Blogs;
};
