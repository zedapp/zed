package main

import (
	"testing"
	"fmt"
	"bytes"
)

func TestFramer(t *testing.T) {
	var byteBuffer bytes.Buffer
	for i := 0; i < 20; i++ {
		fmt.Println(i)
		buf := make([]byte, i * 1024)
		for j := 0; j < len(buf); j++ {
			buf[j] = byte(j % 256)
		}
		WriteFrame(&byteBuffer, byte(i), buf)
		reqId, readBuf, err := ReadFrame(&byteBuffer)
		if err != nil {
			t.Fail()
		}
		if reqId != byte(i) {
			t.Fail()
		}
		if !bytes.Equal(buf, readBuf) {
			t.Fail()
		}
	}
}
