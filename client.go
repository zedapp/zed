package main

import (
	"flag"
	"os"
	"log"
	"path/filepath"
	"fmt"
	"time"
	"net/url"
	"strings"
	"bytes"
	"io/ioutil"
	"mime"
	"net/http"
	"encoding/json"
	"code.google.com/p/go.net/websocket"
)

type HttpError interface {
	error
	StatusCode() int
}

// Errors
type HandlingError struct { 
	message string
}

func (self *HandlingError) StatusCode() int {
	return 500
}

func (self *HandlingError) Error() string {
	return self.message
}

func NewHandlingError(message string) HttpError {
	return &HandlingError { message }
} 

type httpError struct {
	statusCode int
	message string
}

func (self *httpError) Error() string {
	return self.message
}

func (self *httpError) StatusCode() int {
	return self.statusCode
}

func NewHttpError(statusCode int, message string) HttpError {
	return &httpError { statusCode, message }
}

func safePath(rootPath string, path string) (string, error) {
	absPath, err := filepath.Abs(filepath.Join(rootPath, path))
	if err != nil {
		return "", NewHttpError(500, err.Error())
	}
	if !strings.HasPrefix(absPath, rootPath) {
		return "", NewHandlingError("Hacking attempt")
	}
	return absPath, nil
}

// TODO clean this up
var rootPath string

func handleRequest(requestChannel chan []byte, responseChannel chan []byte, closeChannel chan bool) {
	commandBuffer, ok := <-requestChannel
	if !ok {
		return
	}
	command := string(commandBuffer)
	// headers
	_, ok = <-requestChannel
	if !ok {
		return
	}

	var err HttpError
	commandParts := strings.Split(command, " ")
	method := commandParts[0]
	path := strings.Join(commandParts[1:], "/")
	if strings.HasPrefix(path, "/") {
		path = path[1:]
	}
	switch method {
	case "GET":
		err = handleGet(path, requestChannel, responseChannel)
	case "HEAD":
		err = handleHead(path, requestChannel, responseChannel)
	case "PUT":
		err = handlePut(path, requestChannel, responseChannel)
	case "DELETE":
		err = handleDelete(path, requestChannel, responseChannel)
	case "POST":
		err = handlePost(path, requestChannel, responseChannel)
	}
	if err != nil {
		sendError(responseChannel, err, commandParts[0] != "HEAD")
	}
	responseChannel <- DELIMITERBUFFER
	closeChannel <- true
}

func sendError(responseChannel chan []byte, err HttpError, withMessageInBody bool) {
	responseChannel <- statusCodeBuffer(err.StatusCode())

	if withMessageInBody {
		responseChannel <- headerBuffer(map[string]string { "Content-Type": "text/plain"})
		responseChannel <- []byte(err.Error())
	} else {
		responseChannel <- headerBuffer(map[string]string { "Content-Length": "0"})
	}
}

func dropUntilDelimiter(requestChannel chan []byte) {
	for {
		buffer, ok := <-requestChannel
		if !ok {
			break
		}
		if IsDelimiter(buffer) {
			break
		}
	}
}

func headerBuffer(headers map[string]string) []byte {
	var headerBuffer bytes.Buffer
	for h, v := range headers {
		headerBuffer.Write([]byte(fmt.Sprintf("%s: %s\n", h, v)))
	}
	bytes := headerBuffer.Bytes()
	return bytes[:len(bytes)-1]
}

func statusCodeBuffer(code int) []byte {
	return IntToBytes(code)
}

func handleGet(path string, requestChannel chan[]byte, responseChannel chan []byte) HttpError {
	dropUntilDelimiter(requestChannel)
	safePath, err := safePath(rootPath, path)
	if err != nil {
		return err.(HttpError)
	}
	stat, err := os.Stat(safePath)
	if err != nil {
		return NewHttpError(404, "Not found")
	}
	responseChannel <- statusCodeBuffer(200)
	if stat.IsDir() {
		responseChannel <- headerBuffer(map[string]string {"Content-Type": "text/plain"})
		files, _ := ioutil.ReadDir(safePath)
		for _, f := range files {
			if f.Name()[0] == '.' {
				continue
			}
			if f.IsDir() {
				responseChannel <- []byte(fmt.Sprintf("%s/\n", f.Name()))
			} else {
				responseChannel <- []byte(fmt.Sprintf("%s\n", f.Name()))
			}
		}
	} else { // File
		mimeType := mime.TypeByExtension(filepath.Ext(safePath))
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
		responseChannel <- headerBuffer(map[string]string {
			"Content-Type": mimeType,
			"ETag": stat.ModTime().String(),
		})
		f, err := os.Open(safePath)
		if err != nil {
			return NewHttpError(500, "Could not open file")
		}
		defer f.Close()
		for {
			buffer := make([]byte, BUFFER_SIZE)
			n, _ := f.Read(buffer)
			if n == 0 {
				break
			}
			responseChannel <- buffer[:n]
		}
	}
	return nil
}

func handleHead(path string, requestChannel chan[] byte, responseChannel chan []byte) HttpError {
	safePath, err := safePath(rootPath, path)
	dropUntilDelimiter(requestChannel)
	if err != nil {
		return err.(HttpError)
	}
	stat, err := os.Stat(safePath)
	if err != nil {
		return NewHttpError(404, "Not found")
	}
	responseChannel <- statusCodeBuffer(200)
	responseChannel <- headerBuffer(map[string]string {
		"ETag": stat.ModTime().String(),
		"Content-Length": "0",
	})
	return nil
}

func handlePut(path string, requestChannel chan[] byte, responseChannel chan []byte) HttpError {
	safePath, err := safePath(rootPath, path)
	if err != nil {
		dropUntilDelimiter(requestChannel)
		return err.(HttpError)
	}
	dir := filepath.Dir(safePath)
	os.MkdirAll(dir, 0700)
	f, err := os.Create(safePath)
	if err != nil {
		dropUntilDelimiter(requestChannel)
		return NewHttpError(500, fmt.Sprintf("Could not create file: %s", safePath))
	}
	for {
		buffer := <-requestChannel
		if IsDelimiter(buffer) {
			break
		}
		_, err := f.Write(buffer)
		if err != nil {
			dropUntilDelimiter(requestChannel)
			return NewHttpError(500, "Could not write to file")
		}
	}
	f.Close()
	stat, _ := os.Stat(safePath)
	responseChannel <- statusCodeBuffer(200)
	responseChannel <- headerBuffer(map[string]string {
		"Content-Type": "text/plain",
		"ETag": stat.ModTime().String(),
	})
	responseChannel <- []byte("OK")
	return nil
}



func handleDelete(path string, requestChannel chan[] byte, responseChannel chan []byte) HttpError {
	safePath, err := safePath(rootPath, path)
	dropUntilDelimiter(requestChannel)
	if err != nil {
		return err.(HttpError)
	}
	_, err = os.Stat(safePath)
	if err != nil {
		return NewHttpError(404, "Not found")
	}
	err = os.Remove(safePath)
	if err != nil {
		return NewHttpError(500, "Could not delete")
	}
	responseChannel <- statusCodeBuffer(200)
	responseChannel <- headerBuffer(map[string]string {
		"Content-Type": "text/plain",
	})
	responseChannel <- []byte("OK")

	return nil
}

func walkDirectory(responseChannel chan []byte, root string, path string) {
	files, _ := ioutil.ReadDir(filepath.Join(root, path))
	for _, f := range files {
		if f.Name()[0] == '.' {
			continue
		}
		if f.IsDir() {
			walkDirectory(responseChannel, root, filepath.Join(path, f.Name()))
		} else {
			responseChannel <- []byte(fmt.Sprintf("/%s\n", filepath.Join(path, f.Name())))
		}
	}
}

func readWholeBody(requestChannel chan []byte) []byte {
	var byteBuffer bytes.Buffer
	for {
		buffer := <-requestChannel
		if IsDelimiter(buffer) {
			break
		}
		byteBuffer.Write(buffer)
	}
	return byteBuffer.Bytes()
}

func handlePost(path string, requestChannel chan[] byte, responseChannel chan []byte) HttpError {
	safePath, err := safePath(rootPath, path)
	body := string(readWholeBody(requestChannel))
	if err != nil {
		return err.(HttpError)
	}
	_, err = os.Stat(safePath)
	if err != nil {
		return NewHttpError(http.StatusNotFound, "Not found")
	}

	queryValues, err := url.ParseQuery(body)
	if err != nil {
		return NewHttpError(http.StatusInternalServerError, "Could not parse body as HTTP post")
	}

	action := queryValues["action"][0]
	switch action {
	case "filelist":
		responseChannel <- statusCodeBuffer(200)
		responseChannel <- headerBuffer(map[string]string {
			"Content-Type": "text/plain",
		})
		walkDirectory(responseChannel, safePath, "")
	default:
		return NewHttpError(http.StatusNotImplemented, "No such action")
	}

	return nil
}

// Side-effect: writes to rootPath
func ParseClientFlags(args []string) (host string, port int) {
	flagSet := flag.NewFlagSet("caelum", flag.ExitOnError)
	flagSet.StringVar(&host, "host", "localhost", "Host to connect to or bind to")
	flagSet.IntVar(&port, "port", 8080, "Port to listen or bind to")
	flagSet.Parse(args)
	if flagSet.NArg() == 0 {
		rootPath = "."
	} else {
		rootPath = args[len(args) - 1]
	}
	return
}

func RunClient(host string, port int, id string) {
	rootPath, _ = filepath.Abs(rootPath)
	fmt.Println("Root path:", rootPath)

	url := fmt.Sprintf("ws://%s:%d/clientsocket", host, port)
	var ws *websocket.Conn
	var timeout time.Duration = 1e8
	for {
		time.Sleep(timeout)
		var err error
		ws, err = websocket.Dial(url, "", url)
		timeout *= 2
		if err != nil {
			fmt.Println("Could not yet connect:", err.Error(), ", trying again in", timeout)
		} else {
			break
		}
	}

	buffer, _ := json.Marshal(HelloMessage{"0.1", id})

	if _, err := ws.Write(buffer); err != nil {
		log.Fatal(err)
		return
	}
	fmt.Printf("URL to connect to: http://%s:%d/fs/%s\n", host, port, id)
	//go PrintStats()
	multiplexer := NewRPCMultiplexer(ws, handleRequest)
	multiplexer.Multiplex()
}
