#!/bin/bash

if [ ! -d "golang-crosscompile" ]; then
    git clone https://github.com/davecheney/golang-crosscompile.git
fi

source golang-crosscompile/crosscompile.bash

mkdir -p release

go-darwin-386 build -o release/caelum-Darwin-i386
go-darwin-amd64 build -o release/caelum-Darwin-x86_64
go-linux-386 build -o release/caelum-Linux-i386
go-linux-amd64 build -o release/caelum-Linux-x86_64
go-linux-arm build -o release/caelum-Linux-armv61
go-freebsd-386 build -o release/caelum-FreeBSD-i386
go-freebsd-amd64 build -o release/caelum-FreeBSD-amd64
go-windows-386 build -o release/caelum.exe