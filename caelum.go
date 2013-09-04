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
		fmt.Println(`caelum runs in three possible modes: client, server and local:

Usage: caelum [-u url] <dir>
       Launches a Caelum client and attaches to a Caelum server exposing
       directory <dir> (or current directory if omitted).
       
Usage: caelum --server [-h ip] [-p port] [--sslcrt file.crt] [--sslkey file.key]
       Launches a Caelum server, binding to IP <ip> on port <port>.
       If --sslcrt and --sslkey are provided, will run in TLS mode for more security.

Usage: caelum --local <root-dir>
       Launches a Caelum server in local mode binding to port 7336. <root-dir> defaults to $HOME
       enforcing that no files can be edited outside the home directory, set it to "/" to enable
       editing of all files on the machine.
	
       When a local mode process is running on the machine, the Caelum ckuebt will detect this,
       and if the Caelum app is running, will automatically open up a new window.
`)
	}
}
