The idea of this s3OnlyBlog is to manage the blog locally, running everything inside docker, and then deploying the static web pages generated to S3.

The simplest way to get things up and running is to update the values in the config files with the values you plan on using.

For example, in app/config/aws.config.js, set the values for ID, SECRET and the BUCKET_NAME on s3 that will hold all the static assets.

Then run:

```
docker-compose up --build
```
Once that is up, to initialize the db, on the host machine run on the command line:
```
docker exec -it db bash -c "cd /app && bash init.sh"
```
