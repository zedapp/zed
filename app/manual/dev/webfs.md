WebFS
=====

WebFS is a super simple protocol that Zed uses to communicate with a remote (or
local) server. You can think of it as a super simplified version of WebDAV. It
is designed to be minimal and easy to implement.

URL
---

All methods below apply to the path represented to the URL, for instance, if
the root path of the WebFS file system is `/home/zef`, and WebFS runs on the
`http://localhost:1338` URL, the URL `http://localhost:1338/git/zed` is expected
to refer to `/home/zef/git/zed`.

GET
---

* Directory (currently unused):
    * Status code: 200
    * Response content-type: `text/directory`
    * Body: List of files and directories, one per line, always starting with `/`,
      and ending with `/` in case of directories, so that it can be unambiguously
      derived if an entry is a directory or a regular file.
* File:
    * Status code: 200
    * Headers:
        * `ETag`: etag header (often `mtime` timestamp)
    * Body: Content of the file.
* Not found:
    * Status code: 404

PUT
---

* File: saves body to path, creating any parent directories if necessary,
  overwriting an existing file or creating a new one.
    * Status code: 200
    * Headers:
        * `ETag`: etag header (often `mtime` timestamp of new version of file)
    * Body: Content of the file.

HEAD
----
Used for file watching.

* File: Used to retrieve ETag for file (to detect file change).
    * Status code: 200
    * Headers:
        * `ETag`: etag header
    * Body: empty

DELETE
------
* File: Deletes file
    * Status code: 200

POST
----
The `POST` method is used for various RPC-style calls. The request is
form-encoded, with an `action` argument that specifies the action. For instance:
`action=filelist` in the POST body.

* `filelist` action on a directory:
    * Status code: 200
    * Body: return one file-per-line listing of all files (not directories) on
      this path and all sub-directories (does not include hidden files). Each
      entry starts with a `/`. Similar to running a `find` on the path.
* `version`:
    * Status code: 200
    * Body: protocol version (e.g. "1.0")


