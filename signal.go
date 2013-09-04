package main

import (
    "fmt"
    "net/http"
    "strings"
    "code.google.com/p/go.net/websocket"
)

// For now we'll only support a single connected client
var signalChan chan string

func HandleSignal(w http.ResponseWriter, r *http.Request) {
    defer r.Body.Close()
    w.Header().Set("Content-type", "text/plain")
    if signalChan == nil {
        w.WriteHeader(500)
        w.Write([]byte("App not connected."))
        return
    }
    signalChan <- r.FormValue("url")
    w.WriteHeader(200)
    w.Write([]byte("OK"))
}

func HandleSignalSocket(ws *websocket.Conn) {
	defer ws.Close()
    fmt.Println("App connected to signaller.")
    signalChan = make(chan string)
    endChan := make(chan bool)

    go func() {
        buffer := make([]byte, BUFFER_SIZE)
        for {
            _, err := ws.Read(buffer)
            if err != nil {
                signalChan = nil
                endChan <- true
                break
            }
        }
    }()

    for {
        select {
        case path := <-signalChan:
            fmt.Println("Received", path)
            if !strings.HasPrefix(path, rootPath) {
                fmt.Println("Received path not a subdirectory of the root", path)
                continue
            }
            relativePath := strings.Replace(path, rootPath, "", 1)
            _, err := ws.Write([]byte(fmt.Sprintf("http://localhost:7336/fs/local%s", relativePath)))
            if err != nil {
                fmt.Println("Closed connection")
                break
            }
        case <-endChan:
            fmt.Println("Connection closed")
            break
        }
    }
}