{ config, pkgs, ... }:
with pkgs.lib;
let
  cfg = config.services.zed;
  zed = import ../default.nix { inherit pkgs; };
in
{

  ###### interface

  options = {

    services.zed = {

      enable = mkOption {
        default = false;
        description = "Whether to enable the Zed server.";
      };

      local = mkOption {
        default = true;
        description = "Whether to run Zed in local mode.";
      };

      user = mkOption {
        default = "root";
        description = "User account under which Zed runs";
      };

      rootPath = mkOption {
        default = "/";
        description = "Root path that is editable";
      };

    };
  };


  ###### implementation

  config = mkIf cfg.enable {

    systemd.services.zed =
      { description = "Zed server";

        wantedBy = [ "multi-user.target" ];
        after = [ "network.target" ];

        serviceConfig = {
          ExecStart = "${zed}/bin/zed ${if cfg.local then "--local" else "--server"} ${cfg.rootPath}";
          User = cfg.user;
        };
      };
      
  };
}