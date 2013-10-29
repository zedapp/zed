#!/bin/sh

cd `dirname $0`/..
cd app/manual
find . -name '*.*' | sed 's/^.//' > all
echo /.zedstate >> all
cd ../settings
find . -name '*.json' | sed 's/^.//' > all
echo /.zedstate >> all
