package main

import (
	"code.google.com/p/gcfg"
	"os"
	"fmt"
)

type Config struct {
    Client struct {
        Url string
    }

    Server struct {
        Ip string
        Port int
        Sslcert string
        Sslkey string
    }

    Local struct {
        Ip string
        Port int
    }
}

func ParseConfig() Config {
    var config Config
    config.Client.Url = "wss://caelum.cc:7337"
    config.Server.Ip = "0.0.0.0"
    config.Server.Port = 7337
    config.Local.Ip = "127.0.0.1"
    config.Local.Port = 7336

    configFile := os.ExpandEnv("$HOME/.caelumrc")
    if _, err := os.Stat(configFile); err == nil {
        err = gcfg.ReadFileInto(&config, configFile)
        if err != nil {
            fmt.Println("Could not read config file ~/.caelumrc", err);
            os.Exit(4)
        }
    }

    return config
}