
var statusCodes = require("http").STATUS_CODES
, qs = require("querystring")
, zlib = require("zlib")
, accept = require("./accept.js")
, mime = require("./mime.js").mimeTypes
, util = require("../lib/util.js")
, json = require("../lib/json.js")
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
	negotiateContent: accept({
		'application/json': function(str) {
			return JSON.parse(str || "{}")
		},
		'application/x-www-form-urlencoded': function(str) {
			return qs.parse(str)
		},
		'multipart/form-data;boundary=': function(str) {
			throw "Not Implemented"
		}
	}),
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


mime.sql = "application/sql"

require("../lib/fn")
require("../lib/timing")

Object.keys(statusCodes).forEach(function(code) {
	if (code >= 400) {
		this[statusCodes[code]] = { code: +code }
	}
}, defaultOptions.errors)

module.exports = createApp

function createApp(_options) {
	var uses = []
	, options = app.options = {}

	json.mergePatch(options, defaultOptions)
	json.mergePatch(options, _options)
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
	app.catchErrors = catchErrors
	app.readBody = readBody
	app.static = require("./static.js")
	app.listen = require("./listen.js")
	app.ratelimit = require("./ratelimit.js")

	addMethod("get", "GET")
	addMethod("post", "POST")
	addMethod("patch", "PATCH")
	addMethod("del", "DELETE")

	return app

	function app(req, res, _next) {
		var usePos = 0
		if (typeof _next !== "function") {
			_next = end
		}

		function next(err) {
			var oldPath, oldUrl
			, method = uses[usePos]
			, path = uses[usePos + 1]

			usePos += 3

			if (
				method && method !== req.method ||
				path && path !== req.url.slice(0, path.length)
				) {
				next()
			} else {
				method = uses[usePos - 1] || _next
				if (path) {
					oldPath = req.baseUrl
					oldUrl = req.url
					req.baseUrl = path
					req.url = req.url.slice(path.length) || "/"
					method(req, res, next, options)
					req.baseUrl = oldPath
					req.url = oldUrl
				} else {
					method(req, res, next, options)
				}
			}
		}
		next()
	}

	function addMethod(method, methodString) {
		app[method] = function(path, fn) {
			return app.use(methodString, path, fn)
		}
	}

	function end(req, res) {
		res.sendStatus(404)
	}
}


function catchErrors(req, res, next, opts) {
	try {
		next()
	} catch(e) {
		sendError(res, opts, e)
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
		//return sendStatus.call(res, 414) // 414 URI Too Long
		throw "URI Too Long"
	}

	req.originalUrl = req.url
	req.cookie = getCookie
	req.content = getContent

	res.cookie = setCookie
	res.link = setLink

	next()
}


function send(body, _opts) {
	var res = this
	, head = res.req.headers
	, negod = res.opts.negotiateAccept(head.accept || head["content-type"] || "*")
	, format = negod.subtype || "json"

	// Safari 5 and IE9 and below drop the original URI's fragment if a HTTP/3xx redirect occurs.
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
	//res.setHeader("Content-Length", body.length)

	// Line and Paragraph separator needing to be escaped in JavaScript but not in JSON,
	// escape those so the JSON can be evaluated or directly utilized within JSONP.
	res.end(
		format === "json" ? body.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") :
		body
	)
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

function getContent(next) {
	var i, tmp
	, req = this
	, head = req.headers
	, negod = req.opts.negotiateContent(head["content-type"] || head.accept || "*")
	, stream = req

	if (head["content-encoding"]) {
		tmp = head["content-encoding"].split(/\W+/)
		for (i = tmp.length; i--; ) {
			if (tmp[i] === "gzip" || tmp[i] === "deflate") {
				// Decompress Gzip or Deflate by auto-detecting the header
				stream = stream.pipe(zlib.createUnzip())
			} else if (tmp[i] && tmp[i] !== "identity") {
				throw "Unsupported Media Type"
			}
		}
	}

	if (negod.type === "multipart") {
		// stream = stream.pipe(multipart(negod.boundary))
	}

	tmp = ""
	stream.on("data", function handleData(data) {
		tmp += data
		// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
		if (tmp.length > req.opts.maxBodySize) {
			req.abort()
			req.res.sendStatus(413)
		}
	})
	.on("end", handleEnd)
	.on("error", function(e) {
		sendError(res, opts, e)
	})

	function handleEnd() {
		try {
			req.body = negod.fn(tmp)
			next(null, req.body, req.parts)
		} catch (e) {
			next(e)
		}
	}
}

function readBody(req, res, next, opts) {
	req.body = {}
	if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
		req.content(next)
	} else {
		next()
	}
}

function getCookie(name, opts) {
	opts = opts || {}

	var req = this
	, junks = ("; " + req.headers.cookie).split("; " + name + "=")

	if (junks.length > 2) {
		;(opts.path || "").split("/").map(function(val, key, arr) {
			var path = arr.slice(0, key+1).join("/")
			, domain = opts.domain
			req.res.cookie(name, "", {ttl: -1, path: path})
			if (domain) {
				req.res.cookie(name, "", {ttl: -1, path: path, domain: domain})

				if (domain !== (domain = domain.replace(/^[^.]+/, "*"))) {
					req.res.cookie(name, "", {ttl: -1, path: path, domain: domain})
				}
			}
		})
		throw "Error: Cookie fixation detected: " + req.headers.cookie
	}

	return decodeURIComponent((junks[1] || "").split(";")[0])
}

function setCookie(name, value, opts) {
	var res = this
	, existing = (res._headers || {})["set-cookie"] || []

	if (!Array.isArray(existing)) {
		existing = [ existing ]
	}

	value = encodeURIComponent(value || "")

	if (opts) {
		value +=
		(opts.ttl      ? "; expires=" + new Date(opts.ttl > 0 ? Date.now() + (opts.ttl*1000) : 0).toUTCString() : "") +
		(opts.path     ? "; path=" + opts.path : "") +
		(opts.domain   ? "; domain=" + opts.domain : "") +
		(opts.secure   ? "; secure" : "") +
		(opts.httpOnly ? "; HttpOnly" : "")
	}

	existing.push(name + "=" + value)

	res.setHeader("Set-Cookie", existing)
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


