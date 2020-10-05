#!/bin/bash

. /app/base.sh

mysqldump -h$HOST -u$USER -p$PASSWORD --no-data --databases ${DB} > /app/${DB}_structure.sql
mysqldump -h$HOST -u$USER -p$PASSWORD --no-create-info --no-create-db --databases ${DB} > /app/${DB}_data.sql
