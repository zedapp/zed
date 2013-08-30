package main

import (
	"bytes"
)

type testReadWriter struct {
	readChannel chan []byte
	writeChannel chan []byte
}

type testError struct {
	message string
}

func (e *testError) Error() string {
	return e.message
}

func (rw *testReadWriter) Read(p []byte) (n int, err error) {
	buffer, ok := <-rw.readChannel
	if !ok {
		return 0, &testError{"Closed"}
	}
	for i := range(buffer) {
		p[i] = buffer[i]
	}
	return len(buffer), nil
}

func (rw *testReadWriter) Write(p []byte) (n int, err error) {
	rw.writeChannel <- p
	return len(p), nil
}

func (rw *testReadWriter) Close() {
	close(rw.readChannel)
}

func echoHandler(requestChannel chan []byte, responseChannel chan []byte, closeChannel chan bool) {
	buffer := <-requestChannel
	buffer2 := <-requestChannel
	responseChannel <- bytes.Join([][]byte{buffer, buffer2}, []byte{})
	closeChannel <- true
}
/*
func TestRPC(t *testing.T) {
	readWriter := &testReadWriter {
		readChannel: make(chan []byte, 2),
		writeChannel: make(chan []byte),
	}
	m := NewRPCMultiplexer(readWriter, echoHandler)
	go m.Multiplex()
	fmt.Println("Go routines", runtime.NumGoroutine())
	var i byte
	for i = 0; i < 5; i++ {
		testBuffer := []byte{i, i+1, i+2, i+3}
		readWriter.readChannel <- testBuffer
	}
	for i = 0; i < 5; i++ {
		testBuffer := []byte{i, i+4, i+5, i+6}
		readWriter.readChannel <- testBuffer
	}
	for i = 0; i < 5; i++ {
		response := <-readWriter.writeChannel
		base := response[0]
		var j byte
		for j = 1; j < byte(len(response)); j++ {
			if response[j] != base + j {
				t.Fail()
			}
		}
		fmt.Println("Got back", response)
	}
	fmt.Println("Go routines", runtime.NumGoroutine())
}

*/
