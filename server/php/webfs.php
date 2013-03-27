<?php

/**
 * This is the function to call to expose a directory
 * @param $rootPath the absolute Unix path of the directory to expose
 * @param $username (optional) BasicAuth username to use
 * @param $password (option) BasicAuth password to use
 */
function webfs($rootPath, $username = null, $password = null) {
    if ($username && $password && ($_SERVER['PHP_AUTH_USER'] != $username || $_SERVER['PHP_AUTH_PW'] != $password)) {
        header('WWW-Authenticate: Basic realm="My Realm"');
        header('HTTP/1.0 401 Unauthorized');
        echo 'Unauthorized';
        exit;
    }

    $path = $_SERVER['PATH_INFO'];
    if(!$path)
        $path = "/";
    $requestMethod = $_SERVER['REQUEST_METHOD'];

    switch($requestMethod) {
    case "GET":
        handleGet($path, $rootPath);
        break;
    case "OPTIONS":
        handleOptions($path, $rootPath);
        break;
    case "PUT":
        handlePut($path, $rootPath);
        break;
    case "DELETE":
        handleDelete($path, $rootPath);
        break;
    case "POST":
        handlePost($path, $rootPath);
        break;
    }
}

function filePath($path, $rootPath) {
    $real = get_absolute_path($rootPath . $path);
    if(substr($real, 0, strlen($rootPath)) != $rootPath) {
        error(500, "Hack attempt");
    }
    return $real;
}

function handleGet($path, $rootPath) {
    $filePath = filePath($path, $rootPath);
    if(file_exists($filePath)) {
        if(is_dir($filePath)) {
            $handle = opendir($filePath);
            header('Content-Type: text/plain');
            while (false !== ($entry = readdir($handle))) {
                if($entry[0] == ".")
                    continue;
                $entryPath = "$filePath/$entry";
                echo is_dir($entryPath) ? "$entry/" : $entry;
                echo "\n";
            }
            closedir($handle);
        } else {
            //header('Content-Transfer-Encoding: binary');
            header('Content-Length: ' . filesize($filePath));
            header('ETag: ' . filemtime($filePath));
            readfile($filePath);
        }
    } else {
        error(404, "File does not exist: ". $filePath);
    }
}

function handleOptions($path, $rootPath) {
    $filePath = filePath($path, $rootPath);
    if(file_exists($filePath)) {
        header('ETag: ' . filemtime($filePath));
    } else {
        error(404, "File does not exist.");
    }
}

/**
 * Write file or make directory
 */
function handlePut($path, $rootPath) {
    $filePath = filePath($path, $rootPath);
    $parentDir = dirname($filePath);
    mkdir($parentDir, 0777, true);
    $input = fopen("php://input", "rb");
    $output = fopen($filePath, "wb");
    if($output) {
        while(($buffer = fread($input, 8192)) != false) {
            fwrite($output, $buffer);
        }
        fclose($input);
        fclose($output);
        http_response_code(200);
        header('ETag: ' . filemtime($filePath));
        echo "OK";
    } else {
        http_response_code(500);
        echo "ERROR";
    }
}

/**
 * Delete file
 */
function handleDelete($path, $rootPath) {
    $filePath = filePath($path, $rootPath);
    error_log("Deleting $filePath");
    if(unlink($filePath)) {
        http_response_code(200);
        echo "OK";
    } else {
        http_response_code(500);
        echo "FAIL";
    }
}

/**
 * RPC like things
 */
function handlePost($path, $rootPath) {
    $action = $_POST["action"];
    $filePath = filePath($path, $rootPath);
    switch($action) {
    case "filelist":
        printRecursiveList($filePath);
        break;
    }
}

function printRecursiveList($dir, $prefix = '/', $hidden = false) {
    $dir = rtrim($dir, '\\/');
    foreach (scandir($dir) as $f) {
        if ($f !== '.' && $f !== '..' && ($hidden || $f[0] != '.')) {
            if (is_dir("$dir/$f")) {
                printRecursiveList("$dir/$f", "$prefix$f/", $hidden);
            } else {
                echo "$prefix$f\n";
            }
        }
    }
    flush();
}

function error($errorCode, $message) {
    global $path;
    http_response_code($errorCode);
    error_log("Error [$path]: " . $message);
    echo "Error: $message";
    exit();
}

function get_absolute_path($path) {
    $path = str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $path);
    $parts = explode(DIRECTORY_SEPARATOR, $path);
    $absolutes = array();
    foreach ($parts as $part) {
        if ('.' == $part) continue;
        if ('..' == $part) {
            array_pop($absolutes);
        } else {
            $absolutes[] = $part;
        }
    }
    return implode(DIRECTORY_SEPARATOR, $absolutes);
}

?>
