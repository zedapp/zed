#!/bin/sh -e

OS=`uname -s`
PROC=`uname -m`

curl http://get.zed.cc/zed-$OS-$PROC > zed
chmod +x zed

echo "Done, zed downloaded into current directory, to start: ./zed"
echo "For help: ./zed --help"