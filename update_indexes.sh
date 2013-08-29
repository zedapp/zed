#!/bin/sh

cd www/manual
find . -name '*.md' | sed 's/^.//' > all
cd ../settings
find . -name '*.json' | sed 's/^.//' > all
