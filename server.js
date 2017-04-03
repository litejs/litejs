
var statusCodes = require("http").STATUS_CODES
, url = require("url")
, qs = require("querystring")
, zlib = require("zlib")


module.exports = createApp

function createApp(options) {
	var uses = []

	options = options || {}

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
		res.end()
	}
}


function catchErrors(req, res, next, opts) {
	try {
		next()
	} catch(e) {
		res.sendError(e, opts)
	}
}


function initRequest(req, res, next, opts) {

	// IE8-10 accept 2083 chars in URL
	// Sitemaps protocol has a limit of 2048 characters in a URL
	// Google SERP tool wouldn't cope with URLs longer than 1855 chars
	if (req.url.length > 255) {
		sendStatus.call(req, 414) // 414 URI Too Long
		return
	}

	var forwarded = req.headers[opts.ipHeader || "x-forwarded-for"]
	req.ip = forwarded ? forwarded.split(/[\s,]+/)[0] : req.connection.remoteAddress
	req.originalUrl = req.url
	req.path = req.url.split("?")[0]
	req.date = new Date()
	req.query = url.parse(req.url, true).query || {}
	req.cookie = getCookie
	req.res = res

	res.sendStatus = sendStatus
	res.sendError = sendError
	res.send = send
	res.cookie = setCookie
	res.link = setLink
	res.req = req

	next()
}


function send(body) {
	var res = this

	if (typeof body !== "string") body = JSON.stringify(body)

	res.setHeader("Content-Type", "application/json")
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

function sendError(e, opts) {
	var res = this
	, map = opts.errors && (opts.errors[e.name] || opts.errors["any"]) || {}
	res.statusCode = map.code || e.code || 500
	res.end(map.message || e.message)
	console.error(e.stack)
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
			if (body.length > 1e6) {
				req.abort()
				res.sendStatus(413)
			}
		})
		.on("end", handleEnd)
		.on("error", function(e) {
			e.code = 400
			res.sendError(e, opts)
		})

		function handleEnd() {
			var type = (head["content-type"] || "").split(";")[0]
			try {
				req.body = (type == "application/json") ? JSON.parse(body||"{}") : qs.parse(body)
				next()
			} catch (e) {
				e.code = 400
				res.sendError(e, opts)
			}
		}
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
		throw new Error("Cookie fixation detected: " + req.headers.cookie)
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

