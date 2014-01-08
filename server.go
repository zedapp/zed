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

type WebFSHandler struct {
}

func quietPanicRecover() {
	if r := recover(); r != nil {
        fmt.Println("Recovered from panic", r)
    }
}

func (self *WebFSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	parts := strings.Split(r.URL.Path, "/")
	id := parts[0]

	defer quietPanicRecover()

	req, err := NewClientRequest(id)

	if err != nil {
		http.Error(w, err.Error(), http.StatusGone)
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
	for {
		buffer := make([]byte, BUFFER_SIZE)
		n, _ := r.Body.Read(buffer)
		if n == 0 {
			break
		}
		req.ch <- buffer[:n]
	}
	req.ch <- DELIMITERBUFFER
	statusCodeBuffer, ok := <-req.ch
	if !ok {
		http.Error(w, "Connection closed", http.StatusInternalServerError)
		return
	}
	statusCode := BytesToInt(statusCodeBuffer)
	headersBuffer, ok := <-req.ch
	if !ok {
		http.Error(w, "Connection close", http.StatusInternalServerError)
		return
	}
	headers := strings.Split(string(headersBuffer), "\n")
	for _, header := range headers {
		headerParts := strings.Split(header, ": ")
		w.Header().Set(headerParts[0], headerParts[1])
	}
	w.WriteHeader(statusCode)

	for {
		buffer, ok := <-req.ch
		if !ok {
			w.Write([]byte("Connection closed"))
			break
		}
		if IsDelimiter(buffer) {
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

func (c *Client) close() {
	for i := range(c.pendingRequests) {
		if c.pendingRequests[i] != nil {
			c.pendingRequests[i].close()
		}
	}
	close(c.writeChannel)
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

func (cr *ClientRequest) close() {
	close(cr.ch)
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
		defer quietPanicRecover()
		// Listen on req.ch and move messages over (after
		// adding requestId to the write channel
		// stop after the delimiter, no more reading will need
		// to happen
		for {
			buffer, ok := <-req.ch
			if !ok {
				break
			}
			clients[uuid].writeChannel <- addRequestId(requestId, buffer)
			if IsDelimiter(buffer) {
				break
			}
		}
	}()
	return req, nil
}

func socketServer(ws *websocket.Conn) {
	defer ws.Close()
	buffer := make([]byte, BUFFER_SIZE)
	n, err := ws.Read(buffer)
	var hello HelloMessage
	err = json.Unmarshal(buffer[:n], &hello)
	if err != nil {
		fmt.Println("Could not parse welcome message.")
		return
	}
	fmt.Println("Client", hello.UUID, "connected")

	client := NewClient(hello.UUID)

	closeSocket := func() {
		client, ok := clients[hello.UUID];
		if ok {
			fmt.Println("Client disconnected", hello.UUID)
			client.close()
			delete(clients, hello.UUID)
		} // else was already closed before
	}

	defer closeSocket()

	// Read frame from socket and forward it to request channel
	go func() {
		defer quietPanicRecover()
		for {
			requestId, buffer, err := ReadFrame(ws)
			if err != nil {
				//fmt.Println("Read error", err)
				closeSocket()
				return
			}
			req := client.pendingRequests[requestId]
			if req == nil {
				fmt.Println("Got response for non-existent request", requestId, string(buffer))
				continue
			}
			req.ch <- buffer
		}
	}()


	for {
		writeBuffer, request_ok := <-client.writeChannel
		if !request_ok {
			return
		}
		err = WriteFrame(ws, writeBuffer[0], writeBuffer[1:])
		if err != nil {
			fmt.Println("Got error", err)
			return
		}
	}
}

func PrintStats() {
	var memStats runtime.MemStats
	for {
		runtime.ReadMemStats(&memStats)
		clientCount := 0
		for _ = range clients {
			clientCount++
		}
		fmt.Printf("Clients: %d Goroutines: %d Memory: %dK\n", clientCount, runtime.NumGoroutine(), memStats.Alloc / 1024)
		time.Sleep(10e9) // Every 10 seconds
	}
}

func ParseServerFlags(args []string) (ip string, port int, sslCrt string, sslKey string) {
	var stats bool
	config := ParseConfig()
	flagSet := flag.NewFlagSet("zed", flag.ExitOnError)
	flagSet.StringVar(&ip, "h", config.Server.Ip, "IP to bind to")
	flagSet.IntVar(&port, "p", config.Server.Port, "Port to listen on")
	flagSet.StringVar(&sslCrt, "sslcrt", config.Server.Sslcert, "Path to SSL certificate")
	flagSet.StringVar(&sslKey, "sslkey", config.Server.Sslkey, "Path to SSL key")
	flagSet.BoolVar(&stats, "stats", false, "Whether to print go-routine count and memory usage stats periodically.")
	flagSet.Parse(args)
	if stats {
		go PrintStats()
	}
	flagSet.Parse(args)
	return
}

func RunServer(ip string, port int, sslCrt string, sslKey string, withSignaling bool) {
	http.Handle("/fs/", http.StripPrefix("/fs/", &WebFSHandler{}))
	http.Handle("/clientsocket", websocket.Handler(socketServer))
	if sslCrt != "" {
		fmt.Printf("Zed server now running on wss://%s:%d\n", ip, port)
		log.Fatal(http.ListenAndServeTLS(fmt.Sprintf("%s:%d", ip, port), sslCrt, sslKey, nil))
	} else {
		fmt.Printf("Zed server now running on ws://%s:%d\n", ip, port)
		log.Fatal(http.ListenAndServe(fmt.Sprintf("%s:%d", ip, port), nil))
	}
}