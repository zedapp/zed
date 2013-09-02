#!/bin/sh -e

OS=`uname -s`
PROC=`uname -m`

curl http://get.caelum.cc/caelum-$OS-$PROC > caelum
chmod +x caelum

echo "Done, caelum downloaded into current directory, to start: ./caelum"
echo "For help: ./caelum --help"