package main

import (
	"os"
	"code.google.com/p/go-uuid/uuid"
	"strings"
	"fmt"
	"flag"
)

func ParseLocalFlags(args []string) (ip string, port int) {
	flagSet := flag.NewFlagSet("caelum", flag.ExitOnError)
	flagSet.StringVar(&ip, "ip", "127.0.0.1", "IP to bind to")
	flagSet.IntVar(&port, "port", 7336, "Port to listen or bind to")
	flagSet.Parse(args)
	if flagSet.NArg() == 0 {
		rootPath = "."
	} else {
		rootPath = args[len(args) - 1]
	}
	return
}

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
		ip, port := ParseServerFlags(os.Args[2:])
		RunServer(ip, port)
	case "client":
		host, port := ParseClientFlags(os.Args[1:])
		id := strings.Replace(uuid.New(), "-", "", -1)
		RunClient(host, port, id)
	case "local":
		host, port := ParseLocalFlags(os.Args[2:])
		go RunServer(host, port)
		RunClient(host, port, "local")
	case "help":
		fmt.Println(`caelum runs in three possible modes: client, server and local:

Usage: caelum [--host hostname] [--port port] <dir>
       Launches a Caelum client and attaches to a Caelum server exposing
       directory <dir> (or current directory if omitted).
       
Usage: caelum --server [--ip ip] [--port port]
       Launches a Caelum server, binding to IP <ip> on port <port>.

Usage: caelum --local  [--ip ip] [--port port] <dir>
	Launches a server and client in the same process exposing directory <dir> for editing.
`)
	}
}
