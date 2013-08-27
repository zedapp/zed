package main

import (
	"log"
	"os"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"fmt"
	"strings"
	"io/ioutil"
	"mime"
)

type HandlingError struct { 
	message string
}

func (self *HandlingError) Error() string {
	return self.message
}

func NewHandlingError(message string) error {
	return &HandlingError { message }
}

type LocalFSHandler struct {
	RootPath string
}

func (self *LocalFSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET": self.HandleGet(w, r)
	case "HEAD": self.HandleHead(w, r)
	case "PUT": self.HandlePut(w, r)
	case "DELETE": self.HandleDelete(w, r)
	case "POST": self.HandlePost(w, r)
	}
}

func (self *LocalFSHandler) safePath(w http.ResponseWriter, path *url.URL) (string, error) {
	absPath, err := filepath.Abs(filepath.Join(self.RootPath, path.Path))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return "", NewHandlingError("Absolute path error")
	}
	if !strings.HasPrefix(absPath, self.RootPath) {
		http.Error(w, "Hacker attempt", http.StatusInternalServerError)
		return "", NewHandlingError("Hacking attempt")
	}
	return absPath, nil
}

func (self *LocalFSHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	safePath, err := self.safePath(w, r.URL)
	if err != nil {
		return
	}
	fmt.Println("Requested: ", safePath)
	stat, err := os.Stat(safePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	if stat.IsDir() {
		w.Header().Set("Content-Type", "text/plain")
		files, _ := ioutil.ReadDir(safePath)
		for _, f := range files {
			if f.Name()[0] == '.' {
				continue
			}
			if f.IsDir() {
				fmt.Fprintf(w, "%s/\n", f.Name())
			} else {
				fmt.Fprintf(w, "%s\n", f.Name())
			}
		}
	} else { // File
		mimeType := mime.TypeByExtension(filepath.Ext(safePath))
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
		w.Header().Set("Content-Type", mimeType)
		w.Header().Set("ETag", stat.ModTime().String())
		// Probably not a good idea for big files, but it it's
		// simple for now
		buffer, err := ioutil.ReadFile(safePath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write(buffer)
	}
}

func (self *LocalFSHandler) HandleHead(w http.ResponseWriter, r *http.Request) {
	safePath, err := self.safePath(w, r.URL)
	if err != nil {
		return
	}
	stat, err := os.Stat(safePath)
	fmt.Println("Requested HEAD: ", safePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("ETag", stat.ModTime().String())
	w.Header().Set("Content-Length", "0")
	w.Write([]byte(""))
}

func (self *LocalFSHandler) HandlePut(w http.ResponseWriter, r *http.Request) {
	safePath, err := self.safePath(w, r.URL)
	if err != nil {
		return
	}
	dir := filepath.Base(safePath)
	os.MkdirAll(dir, 0700)
	buffer, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ioutil.WriteFile(safePath, buffer, 0600)
	stat, _ := os.Stat(safePath)
	w.Header().Set("ETag", stat.ModTime().String())
	w.Header().Set("Content-Length", "2")
	w.Write([]byte("OK"))
}

func (self *LocalFSHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	safePath, err := self.safePath(w, r.URL)
	if err != nil {
		return
	}
	_, err = os.Stat(safePath)
	fmt.Println("Requested DELETE: ", safePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	err = os.Remove(safePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Length", "2")
	w.Write([]byte("OK"))
}

func walkDirectory(w io.Writer, root string, path string) {
	files, _ := ioutil.ReadDir(filepath.Join(root, path))
	for _, f := range files {
		if f.Name()[0] == '.' {
			continue
		}
		if f.IsDir() {
			walkDirectory(w, root, filepath.Join(path, f.Name()))
		} else {
			fmt.Fprintf(w, "/%s\n", filepath.Join(path, f.Name()))
		}
	}
}

func (self *LocalFSHandler) HandlePost(w http.ResponseWriter, r *http.Request) {
	safePath, err := self.safePath(w, r.URL)
	if err != nil {
		return
	}
	_, err = os.Stat(safePath)
	action := r.FormValue("action")
	fmt.Println("Requested POST: ", safePath, "action:", action)
	switch action {
	case "filelist":
		w.Header().Set("Content-type", "text/plain")
		walkDirectory(w, safePath, "")
	}
}

func main() {
	staticFiles := "../app/"
	http.Handle("/editor/", http.StripPrefix("/editor/", http.FileServer(http.Dir(staticFiles))))
	http.Handle("/fs/", http.StripPrefix("/fs/", &LocalFSHandler{"/Users/zef/git/zed"}))
	log.Fatal(http.ListenAndServe(":8080", nil))
}








