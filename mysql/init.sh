#!/bin/bash

. /app/base.sh

mysql -u${USER} -p${PASSWORD} < blogs_structure.sql
printf "\ndb structure created\n"
if [ -f "blogs_data.sql" ]; then
  mysql -u${USER} -p${PASSWORD} < blogs_data.sql
  printf "\nImported blogs_data.sql\n"
else
  printf "\nDid not find a blogs_data.sql file and did not import any data.\n"
fi
