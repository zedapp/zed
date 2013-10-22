package main

import (
	"fmt"
	"io"
)

type Request struct {
	requestChannel chan []byte
	responseChannel chan []byte
	closeChannel chan bool
}

type RPCHandler func(requestChannel chan []byte, responseChannel chan []byte, closeChannel chan bool)

type RPCMultiplexer struct {
	rw io.ReadWriter
	OutstandingRequests []*Request
	writeChannel chan []byte
	handler RPCHandler
}

func NewRPCMultiplexer(rw io.ReadWriter, handler RPCHandler) *RPCMultiplexer {
	return &RPCMultiplexer {
		rw: rw,
		handler: handler,
	}
}

func (m *RPCMultiplexer) writer() {
	for {
		buffer, ok := <-m.writeChannel
		if !ok {
			break
		}
		err := WriteFrame(m.rw, buffer[0], buffer[1:])
		if err != nil {
			fmt.Println("Couldn't write frame", err)
			close(m.writeChannel)
			break
		}
	}
}

func (m *RPCMultiplexer) responseListener(requestId byte, responseChannel chan []byte) {
	for {
		buffer, ok := <-responseChannel
		if !ok {
			break
		}
		m.writeChannel <- addRequestId(requestId, buffer)
	}
}

func (m *RPCMultiplexer) closeListener(requestId byte, closeChannel chan bool) {
	_ = <-closeChannel
	req := m.OutstandingRequests[requestId]
	//fmt.Println("Now going to close stuff for", req)
	close(req.requestChannel)
	close(req.responseChannel)
	close(req.closeChannel)
	m.OutstandingRequests[requestId] = nil
}

func (m *RPCMultiplexer) Multiplex() error {
	m.OutstandingRequests = make([]*Request, 255)
	m.writeChannel = make(chan []byte)

	go m.writer()

	for {
		requestId, buffer, err := ReadFrame(m.rw)
		if err != nil {
			return err
		}
		req := m.OutstandingRequests[requestId]
		if req == nil {
			req = &Request {
				requestChannel: make(chan []byte, 10),
				responseChannel: make(chan []byte, 10),
				closeChannel: make(chan bool),
			}
			m.OutstandingRequests[requestId] = req
			go m.responseListener(requestId, req.responseChannel)
			go m.closeListener(requestId, req.closeChannel)
			go m.handler(req.requestChannel, req.responseChannel, req.closeChannel)
		}
		req.requestChannel <- buffer
	}
  return nil
}
