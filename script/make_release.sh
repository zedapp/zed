#!/bin/bash

cd `dirname $0`/..

if [ ! -d "golang-crosscompile" ]; then
    git clone https://github.com/davecheney/golang-crosscompile.git
fi

source golang-crosscompile/crosscompile.bash

mkdir -p release

go-darwin-386 build -o release/zed-Darwin-i386
go-darwin-amd64 build -o release/zed-Darwin-x86_64
go-linux-386 build -o release/zed-Linux-i386
go-linux-386 build -o release/zed-Linux-i686
go-linux-amd64 build -o release/zed-Linux-x86_64
go-linux-arm build -o release/zed-Linux-armv61
go-freebsd-386 build -o release/zed-FreeBSD-i386
go-freebsd-amd64 build -o release/zed-FreeBSD-amd64
go-windows-386 build -o release/zed.exe
