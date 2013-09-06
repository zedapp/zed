#!/bin/sh

cd `dirname $0`
cd app
curl -L https://github.com/zefhemel/ace-builds/archive/master.tar.gz | tar xzf -
rm -rf ace
mv ace-builds-master/ace ace
rm -rf ace/snippets
rm ace/worker-*.js
rm -rf ace-builds-master
