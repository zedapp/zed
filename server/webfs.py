#!/usr/bin/python

##  Usage: webfs.py [rootPath] [port]
##     rootPath defaults to $HOME
##     port defaults to 1338

from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import os, os.path
import sys
import cgi
import errno
import urllib
import StringIO
import subprocess
import json

PORT_NUMBER = 1338
ROOT = os.getenv("HOME")
if len(sys.argv) > 1:
    ROOT = sys.argv[1]
if len(sys.argv) > 2:
    PORT_NUMBER = int(sys.argv[2])

class Handler(BaseHTTPRequestHandler):
    def safe_path(self, path):
        path = os.path.abspath(ROOT + urllib.unquote(path))
        if not path.startswith(ROOT):
            return self.error(500, "Hacker attempt?")
        return path
        
    def send_etag_header(self, path):
        stat = os.stat(path)
        self.send_header('ETag', str(int(stat.st_mtime)))

    def do_GET(self):
        filePath = self.safe_path(self.path)
        if not os.path.exists(filePath):
            return self.error(404, "Path not found")
        self.send_response(200)
        self.send_etag_header(filePath)
        if os.path.isdir(filePath):
            self.send_header('Content-type','text/plain')
            self.end_headers()
            for file in os.listdir(filePath):
                if file.startswith("."):
                    continue
                if os.path.isdir("%s/%s" % (filePath, file)):
                    self.wfile.write("%s/\n" % file)
                else:
                    self.wfile.write("%s\n" % file)
        else: # file
            f = open(filePath, 'rb')
            buf = f.read()
            self.send_header('Content-length', '%d' % len(buf))
            self.end_headers()
            self.wfile.write(buf)
            f.close()

    def do_OPTIONS(self):
        filePath = self.safe_path(self.path)
        if not os.path.exists(filePath):
            return self.error(404, "Path not found")
        self.send_response(200)
        self.send_etag_header(filePath)
        self.end_headers()

    def do_PUT(self):
        filePath = self.safe_path(self.path)
        parentDir = os.path.dirname(filePath)
        if not os.path.exists(parentDir):
            os.makedirs(parentDir)
        f = open(filePath, 'wb')
        varLen = int(self.headers['Content-Length'])
        buf = self.rfile.read(varLen)
        f.write(buf)
        f.close()
        self.send_response(200)
        self.send_etag_header(filePath)
        self.end_headers()
        self.wfile.write("OK")
    
    def do_DELETE(self):
        filePath = self.safe_path(self.path)
        if os.path.exists(filePath):
            os.unlink(filePath)
            self.send_response(200)
            self.end_headers()
            self.wfile.write("OK")
        else:
            self.error(404, "File not found")
            
    def do_POST(self):
        filePath = self.safe_path(self.path)
        ctype, pdict = cgi.parse_header(self.headers.getheader('content-type'))
        if ctype == 'multipart/form-data':
            postvars = cgi.parse_multipart(self.rfile, pdict)
        elif ctype == 'application/x-www-form-urlencoded':
            length = int(self.headers.getheader('content-length'))
            postvars = cgi.parse_qs(self.rfile.read(length), keep_blank_values=1)
        else:
            postvars = {}
        
        print postvars
        if not postvars.has_key("action"):
            return self.error(500, "No action specified")
        action = postvars["action"][0]
        if action == "filelist":
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            for root, dirs, files in os.walk(filePath, followlinks=True):
                dirs[:] = filter(lambda d: not d.startswith('.'), dirs)
                files[:] = filter(lambda d: not d.startswith('.'), files)
                files = [os.path.join(root, f)[len(filePath):] for f in files]
                for fname in files:
                    self.wfile.write("%s\n" % fname)
        elif action == "exec":
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            command_parts = json.loads(postvars["command"][0])
            if(postvars.has_key("input")):
                input = postvars["input"][0]
            else:
                input = ""
            try:
                p = subprocess.call(command_parts, stdin=subprocess.PIPE,
                                                   stdout=self.wfile,
                                                   stderr=self.wfile, cwd=filePath)
                p.communicate(input)
                p.stdin.close()
                self.wfile("\nResult: %d\n" % p.wait())
            except:
                self.wfile.write("Result: 127")

    def error(self, resp, message):
        self.send_response(resp)
        self.send_header('Content-type','text/html')
        self.end_headers()
        self.wfile.write(message)

try:
    server = HTTPServer(('localhost', PORT_NUMBER), Handler)
    print "Started WebFS server listening at http://localhost:%d" % PORT_NUMBER
    print "Exposing filesystem:", ROOT
    server.serve_forever()
except KeyboardInterrupt:
	print '^C received, shutting down the web server'
	server.socket.close()
