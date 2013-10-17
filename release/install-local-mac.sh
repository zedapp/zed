#!/bin/bash -e

INSTALLDIR=$HOME/bin

echo "Zed Local Mac installer"
echo "======================="
echo
echo "I'm about to do the following:"
echo
echo "1. Download Zed into $INSTALLDIR"
echo "2. Install a user Launchd job to run zed --local as a service"
echo
echo "To continue press Enter, to cancel Ctrl-c"

read

echo "Creating $INSTALLDIR"
mkdir -p $INSTALLDIR

echo "Downloading Zed"

curl http://get.zedapp.org/zed-Darwin-`uname -m` > $INSTALLDIR/zed
chmod +x $INSTALLDIR/zed

echo "Creating Launchd config file"

TMPCONFIGPATH=/tmp/zed.local.plist

cat >$TMPCONFIGPATH<<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>KeepAlive</key>
	<dict>
		<key>SuccessfulExit</key>
		<false/>
	</dict>
	<key>Label</key>
	<string>zed.local</string>
	<key>ProgramArguments</key>
	<array>
		<string>$INSTALLDIR/zed</string>
		<string>--local</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
</dict>
</plist>
EOF

echo "Installing Launchd service"
launchctl unload $TMPCONFIGPATH 2> /dev/null
launchctl load $TMPCONFIGPATH
rm $TMPCONFIGPATH

echo "We should be all set! If you're having problems have look at Console.app for error messages."
echo
echo "#protip: Add $INSTALLDIR to your PATH variable to make launching Zed easier."
echo "To do so, add this to ~/.profile:"
echo
echo "   export PATH=\$PATH:$INSTALLDIR"
echo