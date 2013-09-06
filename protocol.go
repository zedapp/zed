package main

import (
	"io"
	"bytes"
)

type HelloMessage struct {
	Version string
	UUID string
}

const DELIMITER = "11~~~~~!!END!!~~~~~11"
var DELIMITERBUFFER = []byte(DELIMITER)
const BUFFER_SIZE = 4096

const PROTOCOL_VERSION = "1.0"

func ReadFrame(r io.Reader) (requestId byte, buffer []byte, err error) {
	buffer = nil
	requestIdBuffer := make([]byte, 1)
	_, err = io.ReadFull(r, requestIdBuffer)
	requestId = requestIdBuffer[0]
	lengthBuffer := make([]byte, 2)
	if err != nil {
		return
	}
	_, err = io.ReadFull(r, lengthBuffer)
	if err != nil {
		return
	}
	length := BytesToInt(lengthBuffer)
	buffer = make([]byte, length)
	_, err = io.ReadFull(r, buffer)
	if err != nil {
		return
	}
	return
}

func WriteFrame(w io.Writer, requestId byte, buffer []byte) error {
	_, err := w.Write([]byte{requestId})
	if err != nil {
		return err
	}
	_, err = w.Write(IntToBytes(len(buffer)))
	if err != nil {
		return err
	}
	totalWritten := 0
	for totalWritten < len(buffer) {
		n, err := w.Write(buffer[totalWritten:])
		if err != nil {
			return err
		}
		totalWritten += n
	}
	return err
}

func IsDelimiter(buffer []byte) bool {
	if len(buffer) != len(DELIMITER) {
		return false
	} else {
		return bytes.Equal(buffer, DELIMITERBUFFER)
	}
  return false
}

func IntToBytes(n int) []byte {
	buf := make([]byte, 2)
	buf[0] = byte(n / 256)
	buf[1] = byte(n % 256)
	return buf
}

func BytesToInt(buf []byte) int {
	return int(buf[0]) * 256 + int(buf[1])
}

