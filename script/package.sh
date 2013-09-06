#!/bin/sh

cd `dirname $0`/..
rm -f zed.zip
cd app
zip ../zed.zip -r *
