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

echo '<?xml version="1.0" encoding="UTF-8"?>' > $TMPCONFIGPATH
echo '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' >> $TMPCONFIGPATH
echo '<plist version="1.0">' >> $TMPCONFIGPATH
echo '<dict>' >> $TMPCONFIGPATH
echo '	<key>KeepAlive</key>' >> $TMPCONFIGPATH
echo '	<dict>' >> $TMPCONFIGPATH
echo '		<key>SuccessfulExit</key>' >> $TMPCONFIGPATH
echo '		<false/>' >> $TMPCONFIGPATH
echo '	</dict>' >> $TMPCONFIGPATH
echo '	<key>Label</key>' >> $TMPCONFIGPATH
echo '	<string>zed.local</string>' >> $TMPCONFIGPATH
echo '	<key>ProgramArguments</key>' >> $TMPCONFIGPATH
echo '	<array>' >> $TMPCONFIGPATH
echo "		<string>$INSTALLDIR/zed</string>" >> $TMPCONFIGPATH
echo '		<string>--local</string>' >> $TMPCONFIGPATH
echo '	</array>' >> $TMPCONFIGPATH
echo '	<key>RunAtLoad</key>' >> $TMPCONFIGPATH
echo '	<true/>' >> $TMPCONFIGPATH
echo '</dict>' >> $TMPCONFIGPATH
echo '</plist>' >> $TMPCONFIGPATH

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