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
}

func ParseConfig() Config {
    var config Config
    config.Client.Url = "ws://server.zedapp.org:7337"
    config.Server.Ip = "0.0.0.0"
    config.Server.Port = 7337

    configFile := os.ExpandEnv("$HOME/.zedrc")
    if _, err := os.Stat(configFile); err == nil {
        err = gcfg.ReadFileInto(&config, configFile)
        if err != nil {
            fmt.Println("Could not read config file ~/.zedrc", err);
            os.Exit(4)
        }
    }

    return config
}
