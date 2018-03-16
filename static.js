


var path = require("path")
, fs = require("fs")
, mime = require("./mime.js").mimeTypes
, debug = require("../lib/log.js")
, flvMagic = "FLV" + String.fromCharCode(1,5,0,0,0,9,0,0,0,9)
, logRange = debug("app:static:range")


module.exports = createStatic


function createStatic(root, options) {
	options = options || {}

	root = path.resolve(root)

	return function(req, res, next) {
		var file
		, method = req.method

		if (method != "GET" && method != "HEAD") {
			res.setHeader("Allow", "GET, HEAD")
			return res.sendStatus(405) // Method not allowed
		}

		try {
			file = path.resolve( root, "." +
				( req.url == "/"
				? "/" + (options.directoryIndex || "index.html")
				: decodeURIComponent( req.url.split("?")[0].replace(/\+/g, " ") )
				) )
		} catch (e) {
			return res.sendStatus(400)
		}

		if (file.slice(0, root.length) != root) {
			return res.sendStatus(403)
		}


		function sendFile(err, stat) {

			if (err) {
				return next()
			}

			if (stat.isDirectory()) {
				return res.sendStatus(403)
			}

			var headers = {}
			, reqMtime = Date.parse(req.headers["if-modified-since"])
			/**
			, etag = [stat.ino, stat.size, stat.mtime.getTime()].join("-")

			if ( req.headers["if-none-match"] === etag || (reqMtime && reqMtime >= stat.mtime)) {
				return sendStatus(res, 304)
			}
			// If the server finds that its version of the resource is different than that demanded by the client,
			// it will return a HTTP/412 Precondition Failed response.
			// If the client sent its ETag using an If-Range header instead of the If-Match,
			// the server would instead return the full response body if the client’s ETag didn’t match.
			// Using If-Range saves one network request in the event that the client needs the complete file.
			headers["ETag"]          = etag
			/*/
			if (reqMtime && reqMtime >= stat.mtime) {
				return res.sendStatus(304)
			}
			//*/

			/*
			* It is important to specify
			* one of Expires or Cache-Control max-age, and
			* one of Last-Modified or ETag, for all cacheable resources.
			* It is redundant to specify both Expires and Cache-Control: max-age,
			* or to specify both Last-Modified and ETag.
			*/

			headers["Last-Modified"] = stat.mtime.toUTCString()
			headers["Cache-Control"] = "public, max-age=" + (options.cacheTime || "3600")

			headers["Content-Type"] = mime[ file.split(".").pop() ] || mime["_default"]
			if (headers["Content-Type"].slice(0, 5) == "text/") {
				headers["Content-Type"] += "; charset=UTF-8"
			}

			/*
			// http://tools.ietf.org/html/rfc3803 Content Duration MIME Header
			headers["Content-Duration"] = 30
			Content-Disposition: Attachment; filename=example.html
			*/


			// https://tools.ietf.org/html/rfc7233 HTTP/1.1 Range Requests

			headers["Accept-Ranges"] = "bytes"

			var info = {
				code: 200,
				start: 0,
				end: stat.size,
				size: stat.size
			}
			, range = req.headers.range

			if (range = range && range.match(/bytes=(\d+)-(\d*)/)) {
				// If-Range
				// If the entity tag does not match,
				// then the server SHOULD return the entire entity using a 200 (OK) response.
				info.start = +range[1]
				info.end = +range[2]

				if (info.start > info.end || info.end > info.size) {
					res.statusCode = 416
					res.setHeader("Content-Range", "bytes */" + info.size)
					return res.end()
				}
				info.code = 206
				info.size = info.end - info.start + 1
				headers["Content-Range"] = "bytes " + info.start + "-" + info.end + "/" + info.size

				logRange(req.headers.range, info)
			}




			//**
			headers["Content-Length"] = info.size
			res.writeHead(info.code, headers)

			if (method == "HEAD") {
				return res.end()
			}

			/*
			* if (cache && qzip) headers["Vary"] = "Accept-Encoding,User-Agent"
			*/

			// Flash videos seem to need this on the front,
			// even if they start part way through. (JW Player does anyway)
			if (info.start > 0 && info.mime === "video/x-flv") {
				res.write(flvMagic)
			}


			fs.createReadStream(file, { flags: "r", start: info.start, end: info.end }).pipe(res)

			/*/
			if ( (""+req.headers["accept-encoding"]).indexOf("gzip") > -1) {
				// Only send a Vary: Accept-Encoding header when you have compressed the content (e.g. Content-Encoding: gzip).
				res.useChunkedEncodingByDefault = false
				res.setHeader("Content-Encoding", "gzip")
				fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res)
			} else {
				fs.createReadStream(file).pipe(res)
			}
			//*/
		}
		fs.stat(file, sendFile)
	}
}




/*

300 Multiple Choices
--------------------
// https://www.w3.org/Style/Examples/007/figures.h

The document name you requested (/Style/Examples/007/figures.) could not be found on this server. However, we found documents with names similar to the one you requested.
Available documents:
 - /Style/Examples/007/figures.it.html.redirect (common basename)

Please consider informing the owner of the __referring page__ about the broken link.

 - It is possible to communicate the list using a set of Link header fields [RFC5988],
   each with a relationship of "alternate".
 - https://tools.ietf.org/html/rfc2295 Transparent Content Negotiation in HTTP
   https://tools.ietf.org/html/draft-ietf-http-alternates-01
   Alternates: {"http://x.org/paper.1" 0.9 {type text/html} {language en}}, {"http://x.org/paper.2" 0.7 {type text/html} {language fr}}


406 Not Acceptable
------------------

It is not what anyone would expect, but if you're sure:
you can for example use a custom header like Accept-confirm: confirm-delete, and return 406 Not Acceptable if the Accept-confirm header is not what you expect.


This is done through the following code:

<a href="javascript:void(0);"
 onclick="document.execCommand('SaveAs',true,'file.html');"
  >Save this page</a> 

  However, usually you want to save another file, the file a hyperlink leads to. To do that javascript is not enough (at least there is no such standard way) and something must be done on the server.
  Forcing SaveAs using the HTTP header

  In order to force the browser to show SaveAs dialog when clicking a hyperlink you have to include the following header in HTTP response of the file to be downloaded: 

  Content-Disposition: attachment; filename="<file name.ext>" 

  Where <file name.ext> is the filename you want to appear in SaveAs dialog (like finances.xls or mortgage.pdf) - without < and > symbols. 

  You have to keep the following in mind:

  The filename should be in US-ASCII charset and shouldn't contain special characters: < > \ " / : | ? * space.
  The filename should not have any directory path information specified.
  The filename should be enclosed in double quotes but most browsers will support file names without double quotes.
  Ancient browsers also required the following (not needed nowadays, but for a fool proof solution might be worth doing):

  Content-Type header should be before Content-Disposition.
  Content-Type header should refer to an unknown MIME type (at least until the older browsers go away).



Try downloading files with Content-disposition

Try the header support in your browser, click here:

Text file with Content-Type of application/x-unknown.

*/




