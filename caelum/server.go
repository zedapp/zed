package main

import (
	"log"
	"net/http"
	"fmt"
	"flag"
	"time"
	"strings"
	"bytes"
	"encoding/json"
	"code.google.com/p/go.net/websocket"
	"runtime"
)

type NoSuchClientError struct {
	uuid string
}

func (e *NoSuchClientError) Error() string {
	return fmt.Sprintf("No such client connected: %s", e.uuid)
}

type HttpHandler struct {
}

func (self *HttpHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	id := parts[0]

	req, err := NewClientRequest(id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	// First send request line
	requestLine := fmt.Sprintf("%s %s", r.Method, "/" + strings.Join(parts[1:], "/"))
	fmt.Println(requestLine)
	req.ch <- []byte(requestLine)
	// Then send headers
	var headerBuffer bytes.Buffer
	for h, v := range r.Header {
		headerBuffer.Write([]byte(fmt.Sprintf("%s: %s\n", h, v)))
	}
	req.ch <- headerBuffer.Bytes()

	// Send body
	//fmt.Println("Reading body")
	for {
		buffer := make([]byte, BUFFER_SIZE)
		n, _ := r.Body.Read(buffer)
		if n == 0 {
			break
		}
		req.ch <- buffer[:n]
	}
	req.ch <- DELIMITERBUFFER
	//fmt.Println("Listening for status code")
	statusCode := BytesToInt(<-req.ch)
	//fmt.Println("Getting headers")
	headers := strings.Split(string(<-req.ch), "\n")
	for _, header := range headers {
		headerParts := strings.Split(header, ": ")
		w.Header().Set(headerParts[0], headerParts[1])
	}
	w.WriteHeader(statusCode)

	//fmt.Println("Listening for body")
	for {
		buffer, ok := <-req.ch
		if !ok {
			break
		}
		_, err := w.Write(buffer)
		if err != nil {
			fmt.Println("Got error", err)
			break
		}
	}
}

var clients map[string]*Client = make(map[string]*Client)

type Client struct {
	currentRequestId byte
	writeChannel chan []byte
	pendingRequests []*ClientRequest
}

func NewClient(uuid string) *Client {
	client := &Client {
		writeChannel: make(chan []byte),
		pendingRequests: make([]*ClientRequest, 255),
	}
	clients[uuid] = client
	return client
}

type ClientRequest struct {
	requestId byte
	// Reusing channel for reading and writing
	ch chan[] byte
}

func addRequestId(requestId byte, buffer []byte) []byte {
	newBuffer := make([]byte, len(buffer)+1)
	newBuffer[0] = requestId
	for i := range buffer {
		newBuffer[i+1] = buffer[i]
	}
	return newBuffer
}
	
func NewClientRequest(uuid string) (*ClientRequest, error) {
	client, ok := clients[uuid]
	if !ok {
		return nil, &NoSuchClientError{uuid}
	}
	client.currentRequestId = (client.currentRequestId + 1) % 255
	requestId := client.currentRequestId
	req := &ClientRequest {
		requestId: requestId,
		ch: make(chan []byte),
	}
	client.pendingRequests[requestId] = req

	go func() {
		// Listen on req.ch and move messages over (after
		// adding requestId to the write channel
		// stop after the delimiter, no more reading will need
		// to happen
		for {
			buffer := <-req.ch
			clients[uuid].writeChannel <- addRequestId(requestId, buffer)
			if IsDelimiter(buffer) {
				break
			}
		}
	}()
	return req, nil
}

func socketServer(ws *websocket.Conn) {
	buffer := make([]byte, BUFFER_SIZE)
	n, err := ws.Read(buffer)
	var hello HelloMessage
	err = json.Unmarshal(buffer[:n], &hello)
	fmt.Println("Client", hello.UUID, "connected")

	client := NewClient(hello.UUID)

	// Read frame from socket and forward it to request channel
	go func() {
		for {
			requestId, buffer, err := ReadFrame(ws)
			if err != nil {
				fmt.Println("Read error", err)
				return
			}
			req := client.pendingRequests[requestId]
			if req == nil {
				fmt.Println("Got response for non-existent request", requestId, string(buffer))
				continue
			}
			if IsDelimiter(buffer) {
				close(req.ch)
			} else {
				req.ch <- buffer
			}
		}
	}()

	closeSocket := func() {
		fmt.Print("Closed!")
		// TODO clean up all requests, close all channels etc.
		delete(clients, hello.UUID)
	}

	for {
		writeBuffer, request_ok := <-client.writeChannel
		if !request_ok {
			closeSocket()
			break
		}
		err = WriteFrame(ws, writeBuffer[0], writeBuffer[1:])
		if err != nil {
			fmt.Println("Got error", err)
			closeSocket()
			break
		}
	}
}

func PrintStats() {
	var memStats runtime.MemStats
	for {
		runtime.ReadMemStats(&memStats)
		fmt.Printf("Number of go-routines: %d Memory used: %dK\n", runtime.NumGoroutine(), memStats.Alloc / 1024)
		time.Sleep(5e9)
	}
}

func RunServer(args []string) {
	flagSet := flag.NewFlagSet("caelum", flag.ExitOnError)
	var staticFilePath string
	var host string
	var port int
	var staticFiles string
	flagSet.StringVar(&host, "host", "0.0.0.0", "Host to bind to")
	flagSet.IntVar(&port, "port", 8080, "Port to listen or bind to")
	flagSet.StringVar(&staticFiles, "editorfiles", "../www/", "Location to editor files")
	flagSet.Parse(args)

	http.Handle("/editor/", http.StripPrefix("/editor/", http.FileServer(http.Dir(staticFilePath))))
	http.Handle("/fs/", http.StripPrefix("/fs/", &HttpHandler{}))
	http.Handle("/socket", websocket.Handler(socketServer))
	//go PrintStats()
	fmt.Printf("Now accepting connections on %s:%d\n", host, port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}

