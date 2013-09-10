{ pkgs ? import <nixpkgs> {}
, stdenv ? pkgs.stdenv
}:
let
    gopkg = { name, path, src }:
        stdenv.mkDerivation {
            inherit name src;
            installPhase = ''
                mkdir -p $out/src/${path}
                cp -r * $out/src/${path}/
            '';
        };
    websocket = gopkg {
        name = "go.net";
        path = "code.google.com/p/go.net";
        src = pkgs.fetchhg {
            url = https://code.google.com/p/go.net;
            tag = "bc411e2ac33f";
        };
    };
    gcfg = gopkg {
        name = "gcfg";
        path = "code.google.com/p/gcfg";
        src = pkgs.fetchgit {
            url = https://code.google.com/p/gcfg/;
            rev = "4bedf9880f04908ce2c654950503e40563291f52";
        };
    };
    uuid = gopkg {
        name = "uuid";
        path = "code.google.com/p/go-uuid";
        src = pkgs.fetchhg {
            url = https://code.google.com/p/go-uuid/;
            tag = "5fac954758f5";
        };
    };
in stdenv.mkDerivation {
    name = "zed-0.3";
    src = ./.;
    buildInputs = [ pkgs.go ];
    GOPATH = "${websocket}:${gcfg}:${uuid}";
    buildPhase = ''
        go build
    '';
    installPhase = ''
        mkdir -p $out/bin
        cp zed $out/bin/
    '';
}