#!/bin/sh

cd `dirname $0`/..
cd app/manual
find . -name '*.*' | sed 's/^.//' > all
cd ../config
find . -name '*.*' | sed 's/^.//' > all
