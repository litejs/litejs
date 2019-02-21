
var statusCodes = require("http").STATUS_CODES
, fs = require("fs")
, zlib = require("zlib")
, accept = require("./accept.js")
, cookie = require("./cookie.js")
, getContent = require("./content.js")
, mime = require("./mime.js")
, util = require("../lib/util.js")
, events = require("../lib/events")
, empty = {}
, defaultOptions = {
	maxURILength: 2000,
	maxBodySize:  1e6,
	memBodySize:  1e6,
	maxFields:    1000,
	maxFiles:     1000,
	maxFieldSize: 1000,
	maxFileSize:  Infinity,
	negotiateAccept: accept([
		'application/json;space=',
		'text/csv;headers=no;delimiter=",";NULL=;br="\r\n"',
		'application/sql;NULL=NULL;table=table;fields='
	]),
	errors: {
		// new Error([message[, fileName[, lineNumber]]])
		//   - EvalError - The EvalError object indicates an error regarding the global eval() function.
		//     This exception is not thrown by JavaScript anymore,
		//     however the EvalError object remains for compatibility.
		//   - RangeError - a value is not in the set or range of allowed values.
		//   - ReferenceError - a non-existent variable is referenced
		//   - SyntaxError - trying to interpret syntactically invalid code
		//   - TypeError - a value is not of the expected type
		//   - URIError - a global URI handling function was used in a wrong way
		"URIError": { code: 400 }
	}
}

require("../lib/fn")
require("../lib/timing")

Object.keys(statusCodes).forEach(function(code) {
	if (code >= 400) {
		this[statusCodes[code]] = { code: +code }
	}
}, defaultOptions.errors)

module.exports = function createApp(_options) {
	var uses = []
	, options = app.options = {}

	util.deepAssign(options, defaultOptions, _options)
	events.asEmitter(app)

	app.use = function appUse(method, path) {
		var fn
		, arr = Array.from(arguments)
		, len = arr.length
		, i = 2
		if (typeof method === "function") {
			method = path = null
			i = 0
		} else if (typeof path === "function") {
			path = method
			method = null
			i = 1
		}
		for (; i < len; ) {
			if (typeof arr[i] !== "function") throw Error("Not a function")
			uses.push(method, path, arr[i++])
		}
		return app
	}

	app.addMethod = addMethod
	app.initRequest = initRequest
	app.readBody = readBody
	app.static = require("./static.js")
	app.listen = require("./listen.js")

	addMethod("del", "DELETE")
	addMethod("get", "GET")
	addMethod("patch", "PATCH")
	addMethod("post", "POST")
	addMethod("put", "PUT")

	return app

	function app(req, res, _next) {
		var oldPath, oldUrl
		, usePos = 0

		function next(err) {
			if (err) {
				return sendError(res, options, err)
			}
			var method = uses[usePos]
			, path = uses[usePos + 1]

			usePos += 3

			if (
				method && method !== req.method ||
				path && path !== req.url.slice(0, path.length)
				) {
				next()
			} else if (uses[usePos - 1] === void 0) {
				if (typeof _next === "function") {
					_next()
				} else {
					res.sendStatus(404)
				}
			} else {
				method = uses[usePos - 1]
				if (path) {
					oldPath = req.baseUrl
					oldUrl = req.url
					req.baseUrl = path
					req.url = req.url.slice(path.length) || "/"
					method.call(app, req, res, nextPath, options)
				} else {
					method.call(app, req, res, next, options)
				}
			}
		}
		function nextPath(e) {
			req.baseUrl = oldPath
			req.url = oldUrl
			next(e)
		}
		try {
			next()
		} catch(e) {
			sendError(res, options, e)
		}
	}

	function addMethod(method, methodString) {
		app[method] = function() {
			var arr = uses.slice.call(arguments)
			if (typeof arr[0] === "function") {
				arr.unshift(null)
			}
			arr.unshift(methodString)
			return app.use.apply(app, arr)
		}
	}
}



function initRequest(req, res, next, opts) {
	var forwarded = req.headers[opts.ipHeader || "x-forwarded-for"]
	req.ip = forwarded ? forwarded.split(/[\s,]+/)[0] : req.connection.remoteAddress
	req.res = res
	res.req = req
	req.date = new Date()
	res.send = send
	res.sendStatus = sendStatus
	res.opts = req.opts = opts

	// IE8-10 accept 2083 chars in URL
	// Sitemaps protocol has a limit of 2048 characters in a URL
	// Google SERP tool wouldn't cope with URLs longer than 1855 chars
	if (req.url.length > opts.maxURILength) {
		return sendError(res, opts, "URI Too Long")
		// throw "URI Too Long"
	}

	req.originalUrl = req.url
	req.cookie = cookie.get
	req.content = getContent

	res.cookie = cookie.set
	res.link = setLink
	res.sendFile = sendFile

	next()
}


function send(body, _opts) {
	var res = this
	, head = res.req.headers
	, negod = res.opts.negotiateAccept(head.accept || head["content-type"] || "*")
	, format = negod.subtype || "json"

	// Safari 5 and IE9 drop the original URI's fragment if a HTTP/3xx redirect occurs.
	// If the Location header on the response specifies a fragment, it is used.
	// IE10+, Chrome 11+, Firefox 4+, and Opera will all "reattach" the original URI's fragment after following a 3xx redirection.

	if (!format) {
		return res.sendStatus(406)
	}

	if (typeof body !== "string") {
		negod.select = _opts && _opts.select || res.req.url.split("$select")[1] || ""
		if (format == "csv") {
			body = require("../lib/csv.js").encode(body, negod)
		} else if (format == "sql") {
			negod.re = /\D/
			negod.br = "),\n("
			negod.prefix = "INSERT INTO " +
			negod.table + (negod.fields ? " (" + negod.fields + ")" : "") + " VALUES ("
			negod.postfix = ");"
			body = require("../lib/csv.js").encode(body, negod)
		} else {
			body = JSON.stringify(body, null, +negod.space || negod.space)
		}
	}

	res.setHeader("Content-Type", mime[format])
	// Content-Type: application/my-media-type+json; profile=http://example.com/my-hyper-schema#
	// res.setHeader("Content-Length", body.length)

	// Line and Paragraph separator needing to be escaped in JavaScript but not in JSON,
	// escape those so the JSON can be evaluated or directly utilized within JSONP.
	res.end(
		format === "json" ? body.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") :
		body
	)
}

var errIsDir = {
	name: "EISDIR",
	code: 403,
	message: "Is Directory"
}
, errBadRange = {
	name: "ERANGE",
	code: 416,
	message: "Range Not Satisfiable"
}
, flvMagic = "FLV" + String.fromCharCode(1,5,0,0,0,9,0,0,0,9)

function sendFile(file, _opts, next) {
	var res = this
	, opts = _opts || {}

	if (typeof opts === "function") {
		next = opts
		opts = {}
	}

	fs.stat(file, sendFile)

	function sendFile(err, stat) {
		if (err) {
			return next && next(err)
		}

		if (stat.isDirectory()) {
			return next && next(errIsDir)
		}

		var tmp
		, headers = {}
		, reqMtime = Date.parse(res.req.headers["if-modified-since"])

		if (reqMtime && reqMtime >= stat.mtime) {
			return res.sendStatus(304)
		}

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
		//*/

		/*
		 * It is important to specify one of Expires or Cache-Control max-age,
		 * and one of Last-Modified or ETag, for all cacheable resources.
		 * It is redundant to specify both Expires and Cache-Control: max-age,
		 * or to specify both Last-Modified and ETag.
		 */

		if (typeof opts.maxAge === "number") {
			tmp = opts.cacheControl && opts.cacheControl[file]
			if (typeof tmp !== "number") tmp = opts.maxAge
			headers["Last-Modified"] = stat.mtime.toUTCString()
			headers["Cache-Control"] = tmp === 0 ? "no-cache" : "public, max-age=" + tmp
		}

		if (opts.download) {
			headers["Content-Disposition"] = "attachment; filename=" + (
				opts.download === true ?
				file.split("/").pop() :
				opts.download
			)
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
		, range = res.req.headers.range

		if (range = range && range.match(/bytes=(\d+)-(\d*)/)) {
			// If-Range
			// If the entity tag does not match,
			// then the server SHOULD return the entire entity using a 200 (OK) response.
			info.start = +range[1]
			info.end = +range[2]

			if (info.start > info.end || info.end > info.size) {
				res.setHeader("Content-Range", "bytes */" + info.size)
				return next && next(errBadRange)
			}
			info.code = 206
			info.size = info.end - info.start + 1
			headers["Content-Range"] = "bytes " + info.start + "-" + info.end + "/" + info.size
		}

		headers["Content-Type"] = mime[ file.split(".").pop() ] || mime["_default"]
		if (headers["Content-Type"].slice(0, 5) == "text/") {
			headers["Content-Type"] += "; charset=UTF-8"
		}


		//**
		headers["Content-Length"] = info.size
		res.writeHead(info.code, headers)

		if (res.req.method == "HEAD") {
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


		fs.createReadStream(file, {
			flags: "r",
			start: info.start,
			end: info.end
		}).pipe(res)

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
}

function sendStatus(code, message) {
	var res = this
	res.statusCode = code
	if (code > 199 && code != 204 && code != 304) {
		res.setHeader("Content-Type", "text/plain")
		message = (message || statusCodes[code] || code) + "\n"
		res.setHeader("Content-Length", message.length)
		if ("HEAD" != res.req.method) {
			res.write(message)
		}
	}
	res.end()
}

function sendError(res, opts, e) {
	var message = typeof e === "string" ? e : e.message
	, map = opts.errors && (opts.errors[message] || opts.errors[e.name]) || empty
	, error = {
		id: util.rand(16),
		time: res.req.date,
		code: map.code || e.code || 500,
		message: map.message || message
	}
	res.statusCode = error.code
	res.statusMessage = statusCodes[error.code] || message

	res.send(error)

	;(opts.errorLog || console.error)(
		(e.stack || (e.name || "Error") + ": " + error.message).replace(":", ":" + error.id)
	)
}

function readBody(req, res, next, opts) {
	if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
		req.content(next)
	} else {
		next()
	}
}

function setLink(url, rel) {
	var res = this
	, existing = (res._headers || {})["link"] || []

	if (!Array.isArray(existing)) {
		existing = [ existing ]
	}

	existing.push('<' + encodeURI(url) + '>; rel="' + rel + '"')

	res.setHeader("Link", existing)
}


