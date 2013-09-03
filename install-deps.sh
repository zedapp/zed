#!/bin/sh

go get code.google.com/p/go-uuid/uuid
go get code.google.com/p/go.net/websocket
go get code.google.com/p/gcfg

cd `dirname $0`
cd app
curl -L https://github.com/zefhemel/ace-builds/archive/master.tar.gz | tar xzf -
rm -rf ace
mv ace-builds-master/ace ace
rm -rf ace/snippets
rm -rf ace-builds-master
