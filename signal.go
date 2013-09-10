package main

import (
    "fmt"
    "net/http"
    "strings"
    "code.google.com/p/go.net/websocket"
)

// For now we'll only support a single connected client
var signalChan chan string = make(chan string, 25)
var signalAppConnected bool

func HandleSignal(w http.ResponseWriter, r *http.Request) {
    defer r.Body.Close()
    w.Header().Set("Content-type", "text/plain")
    signalChan <- r.FormValue("url")
    if signalAppConnected {
        w.WriteHeader(200)
        w.Write([]byte("OK"))
        return
    } else {
        w.WriteHeader(500)
        w.Write([]byte("App not connected."))
    }
}

func HandleSignalSocket(ws *websocket.Conn) {
	defer ws.Close()
    fmt.Println("App connected to signaller.")
    if signalAppConnected {
        fmt.Println("Second client connected, not supported.")
        return
    }
    signalAppConnected = true
    endChan := make(chan bool)

    go func() {
        buffer := make([]byte, BUFFER_SIZE)
        for {
            _, err := ws.Read(buffer)
            if err != nil {
                signalAppConnected = false
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
            return
        }
    }
}