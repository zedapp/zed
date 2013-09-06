#!/bin/sh

cd `dirname $0`/..
cd app/manual
find . -name '*.md' | sed 's/^.//' > all
cd ../settings
find . -name '*.json' | sed 's/^.//' > all
