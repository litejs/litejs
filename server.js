
var statusCodes = require("http").STATUS_CODES
, url = require("url")
, qs = require("querystring")
, zlib = require("zlib")
, mime = require("./mime.js").mimeTypes
, util = require("../lib/util.js")
, json = require("../lib/json.js")
, events = require("../lib/events")
, empty = {}
, defaultOptions = {
	maxURILength: 255,
	maxBodySize: 1e6,
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

require("../lib/format")
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

	app.use = function appUse(method, path, fn) {
		var argi = arguments.length
		if (argi === 1) {
			fn = method
			method = path = null
		} else if (argi === 2) {
			fn = path
			path = method
			method = null
		}
		if (fn) {
			uses.push(method, path, fn)
		}
		return app
	}

	app.addMethod = addMethod
	app.initRequest = initRequest
	app.catchErrors = catchErrors
	app.readBody = readBody
	app.static = require("./static.js")
	app.initProcess = require("./init-process.js")
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

	// IE8-10 accept 2083 chars in URL
	// Sitemaps protocol has a limit of 2048 characters in a URL
	// Google SERP tool wouldn't cope with URLs longer than 1855 chars
	if (req.url.length > opts.maxURILength) {
		//return sendStatus.call(res, 414) // 414 URI Too Long
		throw "URI Too Long"
	}

	req.originalUrl = req.url
	req.path = req.url.split("?")[0]
	req.query = url.parse(req.url, true).query || {}
	req.cookie = getCookie

	res.sendStatus = sendStatus
	res.cookie = setCookie
	res.link = setLink

	next()
}


function send(body, format) {
	var res = this

	// Safari 5 and IE9 and below drop the original URI's fragment if a HTTP/3xx redirect occurs.
	// If the Location header on the response specifies a fragment, it is used.
	// IE10+, Chrome 11+, Firefox 4+, and Opera will all "reattach" the original URI's fragment after following a 3xx redirection.

	if (typeof body !== "string") {
		if (!format) {
			format = negotiate(res.req.headers.accept, ["json", "csv"])
		}
		if (format == "csv") {
			body = require("../lib/csv.js").encode(body, res.req.query.$select)
		} else {
			body = JSON.stringify(body)
		}
	}

	res.setHeader("Content-Type", mime[format || "json"])
	// Content-Type: application/my-media-type+json; profile=http://example.com/my-hyper-schema#
	//res.setHeader("Content-Length", body.length)

	// Line and Paragraph separator needing to be escaped in JavaScript but not in JSON,
	// escape those so the JSON can be evaluated or directly utilized within JSONP.
	res.end(body.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"))
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
	var body = ""
	//TODO: implement query["$method"]
	, method = req.method
	, head = req.headers

	req.body = {}

	if (method == "POST" || method == "PUT" || method == "PATCH") {
		;(head["content-encoding"] ? req.pipe(zlib.createUnzip()) : req)
		.on("data", function handleData(data) {
			body += data
			// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
			if (body.length > opts.maxBodySize) {
				req.abort()
				res.sendStatus(413)
			}
		})
		.on("end", handleEnd)
		.on("error", function(e) {
			sendError(res, opts, e)
		})
	} else {
		next()
	}

	function handleEnd() {
		try {
			var type = (head["content-type"] || "").split(";")[0]
			req.body = (type == "application/json") ? JSON.parse(body||"{}") : qs.parse(body)
			next()
		} catch (e) {
			sendError(res, opts, e)
		}
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

function negotiate(header, accepted) {
	// Multiple types, weighted with the quality value syntax:
	// Accept: text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8
	// Accept: text/*, text/plain, text/plain;format=flowed, */*, application/vnd.example-com.foo+json; version=1.0
	// Accept: application/vnd.steveklabnik-v2+json
	// Accept: vnd.example-com.foo+json; version=1.0
	// The default value for q is 1, with the same quality, more specific values have priority over less specific ones
	var match = header && header.split(/[\/,\s;]+/)[1]
	return match && accepted.indexOf(match) > -1 ? match : accepted[0]
}

