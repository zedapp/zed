#!/bin/sh

jam install
cd www
curl -L https://github.com/ajaxorg/ace-builds/archive/master.tar.gz | tar xzf -
ln -s ace-builds-master/src-min-noconflict ace
