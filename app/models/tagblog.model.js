module.exports = (sequelize, Sequelize) => {
  const TagBlog = sequelize.define("tagsblogs", {
    blogId: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    tagId: {
      type: Sequelize.INTEGER,
      primaryKey: true
    }
  });
  return TagBlog;
};
