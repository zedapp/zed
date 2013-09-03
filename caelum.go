package main

import (
	"os"
	"code.google.com/p/go-uuid/uuid"
	"strings"
	"fmt"
	"flag"
)

func ParseLocalFlags(args []string) (ip string, port int) {
	config := ParseConfig()
	flagSet := flag.NewFlagSet("caelum", flag.ExitOnError)
	flagSet.StringVar(&ip, "h", config.Local.Ip, "IP to bind to")
	flagSet.IntVar(&port, "p", config.Local.Port, "Port to listen or bind to")
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
		ip, port, sslCrt, sslKey := ParseServerFlags(os.Args[2:])
		RunServer(ip, port, sslCrt, sslKey)
	case "client":
		url := ParseClientFlags(os.Args[1:])
		id := strings.Replace(uuid.New(), "-", "", -1)
		RunClient(url, id)
	case "local":
		host, port := ParseLocalFlags(os.Args[2:])
		go RunServer(host, port, "", "")
		RunClient(fmt.Sprintf("ws://%s:%d", host, port), "local")
	case "help":
		fmt.Println(`caelum runs in three possible modes: client, server and local:

Usage: caelum [-u url] <dir>
       Launches a Caelum client and attaches to a Caelum server exposing
       directory <dir> (or current directory if omitted).
       
Usage: caelum --server [-h ip] [-p port] [--sslcrt file.crt] [--sslkey file.key]
       Launches a Caelum server, binding to IP <ip> on port <port>.
       If --sslcrt and --sslkey are provided, will run in TLS mode for more security.

Usage: caelum --local  [-h ip] [-p port] <dir>
	Launches a server and client in the same process exposing directory <dir> for editing.
`)
	}
}
