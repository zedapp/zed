package main

import (
	"os"
)

func main() {
	serverMode := false
	if len(os.Args) > 1 && os.Args[1] == "--server" {
		serverMode = true
	}

	if serverMode {
		RunServer(os.Args[2:])
	} else {
		RunClient(os.Args[1:])
	}
}
