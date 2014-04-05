#!/usr/bin/make -f

SHELL = /bin/bash
ZED_DIR = /Users/zef/Dropbox/zed
INDEX_COMMAND = find app/config -name '*.*' -not -path '*/.git/*' -not -path '*/.git' | sort | sed 's:^app/config::' > app/config/all
NW_VERSION=v0.9.2

install-dep:
	curl -L https://github.com/zefhemel/ace-builds/archive/master.tar.gz | tar xzf -
	rm -rf app/ace
	mv ace-builds-master/ace app/ace
	rm -rf ace-builds-master

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

download-nw:
	rm -rf nw/download
	mkdir -p nw/download
	cd nw/download && curl -O http://dl.node-webkit.org/$(NW_VERSION)/node-webkit-$(NW_VERSION)-linux-ia32.tar.gz && tar xzf node-webkit-$(NW_VERSION)-linux-ia32.tar.gz
	cd nw/download && curl -O http://dl.node-webkit.org/$(NW_VERSION)/node-webkit-$(NW_VERSION)-linux-x64.tar.gz && tar xzf node-webkit-$(NW_VERSION)-linux-x64.tar.gz
	cd nw/download && curl -O http://dl.node-webkit.org/$(NW_VERSION)/node-webkit-$(NW_VERSION)-win-ia32.zip && unzip -d node-webkit-$(NW_VERSION)-win-ia32 node-webkit-$(NW_VERSION)-win-ia32.zip
	cd nw/download && curl -O http://dl.node-webkit.org/$(NW_VERSION)/node-webkit-$(NW_VERSION)-osx-ia32.zip && unzip -d node-webkit-$(NW_VERSION)-osx-ia32 node-webkit-$(NW_VERSION)-osx-ia32.zip

apps-mac:
	rm -rf nw/build
	mkdir -p nw/build
	cp -r nw/download/node-webkit-$(NW_VERSION)-osx-ia32/node-webkit.app nw/build/Zed.app
	cp nw/nw.icns nw/build/Zed.app/Contents/Resources/nw.icns
	cp nw/Info.plist nw/build/Zed.app/Contents/Info.plist
	cp -r app nw/build/Zed.app/Contents/Resources/app.nw
	rm release/zed-mac.zip
	cd nw/build; zip -r ../../release/zed-mac.zip Zed.app

app.nw:
	mkdir -p release
	rm -f nw/app.nw
	cd app; zip -r ../nw/app.nw *

apps-win: app.nw
	rm -rf nw/build
	mkdir -p nw/build
	cat nw/download/node-webkit-$(NW_VERSION)-win-ia32/nw.exe nw/app.nw > nw/build/zed.exe
	cp nw/download/node-webkit-$(NW_VERSION)-win-ia32/{nw.pak,icudt.dll} nw/build/
	rm -f release/zed-win.zip
	cd nw/build; zip -r ../../release/zed-win.zip *

apps-linux64: app.nw
	rm -rf nw/build
	mkdir -p nw/build/zed
	cat nw/download/node-webkit-$(NW_VERSION)-linux-x64/nw nw/app.nw > nw/build/zed/zed-bin
	cp nw/download/node-webkit-$(NW_VERSION)-linux-x64/nw.pak nw/build/zed/
	cp nw/zed-linux nw/build/zed/zed
	chmod +x nw/build/zed/zed*
	rm -f release/zed-linux64.tar.gz
	cd nw/build; tar cvzf ../../release/zed-linux64.tar.gz *

apps-linux32: app.nw
	rm -rf nw/build
	mkdir -p nw/build/zed
	cat nw/download/node-webkit-$(NW_VERSION)-linux-ia32/nw nw/app.nw > nw/build/zed/zed-bin
	cp nw/download/node-webkit-$(NW_VERSION)-linux-ia32/nw.pak nw/build/zed/
	cp nw/zed-linux nw/build/zed/zed
	chmod +x nw/build/zed/zed*
	rm -f release/zed-linux32.tar.gz
	cd nw/build; tar cvzf ../../release/zed-linux32.tar.gz *

apps: apps-mac apps-win apps-linux32 apps-linux64

indexes: index-manual index-config
	@true
