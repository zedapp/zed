package main

import (
	"flag"
)

func main() {
	var staticFilePath string
	var serverMode bool
	var serverHost string
	var serverPort int
	var path string
	flag.StringVar(&staticFilePath, "clientfiles", "www/", "Path to client files")
	flag.BoolVar(&serverMode, "server", false, "Whether to run this as a server")
	flag.StringVar(&serverHost, "host", "localhost", "Host to connect to or bind to")
	flag.IntVar(&serverPort, "port", 8080, "Port to listen to")
	flag.StringVar(&path, "path", "/Users/zef/git/zed", "Path to edit")
	flag.Parse()
	if serverMode {
		RunServer(serverPort, staticFilePath)
	} else {
		RunClient(serverHost, serverPort, path)
	}
}
