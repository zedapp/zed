package main

import (
	"os"
	"code.google.com/p/go-uuid/uuid"
	"strings"
	"fmt"
)

func main() {
	mode := "client"

	if len(os.Args) > 1 && os.Args[1] == "--server" {
		mode = "server"
	} else if len(os.Args) > 1 && os.Args[1] == "--local" {
		mode = "local"
	} else if len(os.Args) > 1 && os.Args[1] == "--help" {
		mode = "help"
	}

	switch mode {
	case "server":
		ip, port, sslCrt, sslKey := ParseServerFlags(os.Args[2:])
		RunServer(ip, port, sslCrt, sslKey, false)
	case "client":
		url := ParseClientFlags(os.Args[1:])
		id := strings.Replace(uuid.New(), "-", "", -1)
		RunClient(url, id, false)
	case "local":
		rootPath = os.Getenv("HOME")
		if len(os.Args) > 2 {
			rootPath = os.Args[2]
		}
		go RunServer("127.0.0.1", 7336, "", "", true)
		RunClient("ws://127.0.0.1:7336", "local", true)
	case "help":
		fmt.Println(`zed runs in three possible modes: client, server and local:

Usage: zed [-u url] <dir>
       Launches a Zed client and attaches to a Zed server exposing
       directory <dir> (or current directory if omitted).
       
Usage: zed --server [-h ip] [-p port] [--sslcrt file.crt] [--sslkey file.key]
       Launches a Zed server, binding to IP <ip> on port <port>.
       If --sslcrt and --sslkey are provided, will run in TLS mode for more security.

Usage: zed --local <root-dir>
       Launches a Zed server in local mode binding to port 7336. <root-dir> defaults to $HOME
       enforcing that no files can be edited outside the home directory, set it to "/" to enable
       editing of all files on the machine.
	
       When a local mode process is running on the machine, the Zed ckuebt will detect this,
       and if the Zed app is running, will automatically open up a new window.
`)
	}
}
