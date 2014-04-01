#!/usr/bin/make -f

SHELL = /bin/bash
ZED_DIR = /Users/zef/Dropbox/zed
INDEX_COMMAND = find app/config -name '*.*' -not -path '*/.git/*' -not -path '*/.git' | sort | sed 's:^app/config::' > app/config/all

install-dep:
	curl -L https://github.com/zefhemel/ace-builds/archive/master.tar.gz | tar xzf -
	rm -rf app/ace
	mv ace-builds-master/ace app/ace
	rm -rf ace-builds-master

golang-crosscompile:
	git clone https://github.com/davecheney/golang-crosscompile.git

release: golang-crosscompile
	mkdir -p release
	source golang-crosscompile/crosscompile.bash; \
	go-darwin-386 build -o release/zed-Darwin-i386; \
	go-darwin-amd64 build -o release/zed-Darwin-x86_64; \
	go-linux-386 build -o release/zed-Linux-i386; \
	go-linux-386 build -o release/zed-Linux-i686; \
	go-linux-amd64 build -o release/zed-Linux-x86_64; \
	go-linux-arm build -o release/zed-Linux-armv61; \
	go-freebsd-386 build -o release/zed-FreeBSD-i386; \
	go-freebsd-amd64 build -o release/zed-FreeBSD-amd64; \
	go-windows-386 build -o release/zed.exe

copy-packages:
	rm -rf app/config/packages/*
	cp -r $(ZED_DIR)/packages/gh app/config/packages/

build-package: copy-packages indexes
	rm -f zed.zip
	cd app; zip ../zed.zip -x '*.git*' -r *

package: build-package
	rm -rf app/config/packages/*
	$(INDEX_COMMAND)

index-manual:
	find app/manual -name '*.*' -not -path "*/.git/*" -not -path "*/.git" | sort | sed "s:^app/manual::" > app/manual/all

index-config:
	$(INDEX_COMMAND)

indexes: index-manual index-config
	@true
