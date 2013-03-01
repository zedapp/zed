<?php
require("config.php");
//phpinfo();
$path = $_SERVER['QUERY_STRING'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

switch($requestMethod) {
case "GET":
    handleGet($path);
    break;
case "PUT":
    handlePut($path);
    break;
case "POST":
    handlePost($path);
    break;
}

function filePath($path) {
    $real = get_absolute_path(ROOT_PATH . $path);
    if(substr($real, 0, strlen(ROOT_PATH)) != ROOT_PATH) {
        error("Hack attempt");
    }
    return $real;
}

function handleGet($path) {
    $filePath = filePath($path);
    if(file_exists($filePath)) {
        if(is_dir($filePath)) {
            $handle = opendir($filePath);
            $files = array();
            while (false !== ($entry = readdir($handle))) {
                if($entry == "." || $entry == "..")
                    continue;
                $entryPath = "$filePath/$entry";
                $stat = stat($entryPath);
                $files[$entry] = array(
                    "type" => is_dir($entryPath) ? "dir" : "file",
                    "size" => $stat['size'],
                    "atime" => $stat['atime'],
                    "mtime" => $stat['mtime'],
                    "ctime" => $stat['ctime']
                );
            }
            closedir($handle);
            header('Content-Type: application/json');
            echo json_encode($files, JSON_OPTIONS);
        } else {
            header('Content-Transfer-Encoding: binary');
            header('Content-Length: ' . filesize($filePath));
            readfile($filePath);
        }
    } else {
        error("File does not exist: ". $filePath);
    }
}

/**
 * Write file or make directory
 */
function handlePut($path) {
    $filePath = filePath($path);
    $contentType = $_SERVER["CONTENT_TYPE"];
    if($contentType == "text/directory") {
        $result = mkdir($filePath);
        if($result) {
            http_response_code(200);
            echo "OK";
        } else {
            http_response_code(500);
            echo "ERROR";
        }
    } else {
        $input = fopen("php://input", "rb");
        $output = fopen($filePath, "wb");
        if($output) {
            while(($buffer = fread($input, 8192)) != false) {
                fwrite($output, $buffer);
            }
            fclose($input);
            fclose($output);
            http_response_code(200);
            echo "OK";
        } else {
            http_response_code(500);
            echo "ERROR";
        }
    }
}

/**
 * RPC like things
 */
function handlePost($path) {
    $action = $_POST["action"];
    switch($action) {
    case "find":
        $filePath = filePath($path);
        printRecursiveList($filePath);
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

function error($message) {
    global $path;
    http_response_code(500);
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
