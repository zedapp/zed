#!/bin/sh

cd `dirname $0`/..
cd app/manual
find . -name '*.*' | sed 's/^.//' > all
cd ../settings
find . -name '*.*' | sed 's/^.//' > all
