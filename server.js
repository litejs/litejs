
var fs = require("fs")
, accept = require("./accept").accept
, content = require("./content")
, event = require("./event")
, path = require("./path")
, util = require("./util")
, defaultOpts = {
	maxBodySize:  1e6,
	maxNameSize:  100,
	maxFields:    1000,
	maxFieldSize: 1000,
	maxFiles:     1000,
	maxFileSize:  Infinity,
	maxURILength: 2000,
	log: console,
	exitTime: 5000,
	accept: {
		'application/json;filename=;select=;space=': function(data, negod) {
			return JSON.stringify(
				data,
				negod.select ? negod.select.split(",") : null,
				+negod.space || negod.space
			)
		},
		// RFC 4180 optional parameters: charset, header
		'text/csv;br="\r\n";delimiter=",";fields=;filename=;header=;NULL=;select=': require("./csv.js").encode,
		'application/sql;fields=;filename=;NULL=NULL;select=;table=table': function(data, negod) {
			negod.re = /\D/
			negod.br = "),\n("
			negod.prefix = "INSERT INTO " +
			negod.table + (negod.fields ? " (" + negod.fields + ")" : "") + " VALUES ("
			negod.postfix = ");"
			return csv.encode(data, negod)
		}
	},
	charset: "UTF-8",
	compress: false,
	encoding: {
		"deflate;q=0.1": "createDeflate",
		"gzip;q=0.2": "createGzip",
		"br": "createBrotliCompress"
	},
	error: {
		"URIError": { code: 400 }
	},
	method: {
		"DELETE": "del",
		"GET": "get",
		"PATCH": "patch",
		"POST": "post",
		"PUT": "put"
	},
	mime: {
		"asf": "video/x-ms-asf",
		"asx": "video/x-ms-asx",
		"avi": "video/x-msvideo",
		"css": "text/css",
		"csv": "text/csv",
		"cur": "image/vnd.microsoft.icon",
		"doc": "application/msword",
		"drw": "application/drafting",
		"dvi": "application/x-dvi",
		"dwg": "application/acad",
		"dxf": "application/dxf",
		"gif": "image/gif",
		"gz": "application/x-gzip",
		"htm": "text/html",
		"html": "text/html",
		"ico": "image/x-icon",
		"jar": "application/java-archive",
		"jpeg": "image/jpeg",
		"jpg": "image/jpeg",
		"js": "text/javascript",
		"json": "application/json",
		"m3u": "audio/x-mpegurl",
		"manifest": "text/cache-manifest",
		"midi": "audio/midi",
		"mjs": "text/javascript",
		"mp3": "audio/mpeg",
		"mp4": "video/mp4",
		"mpeg": "video/mpeg",
		"mpg": "video/mpeg",
		"mpga": "audio/mpeg",
		"pdf": "application/pdf",
		"pgp": "application/pgp",
		"png": "image/png",
		"ppz": "application/vnd.ms-powerpoint",
		"ps": "application/postscript",
		"qt": "video/quicktime",
		"ra": "audio/x-realaudio",
		"rar": "application/x-rar-compressed",
		"rm": "audio/x-pn-realaudio",
		"rtf": "text/rtf",
		"rtx": "text/richtext",
		"sgml": "text/sgml",
		"sh": "application/x-sh",
		"snd": "audio/basic",
		"sql": "application/sql",
		"svg": "image/svg+xml",
		"tex": "application/x-tex",
		"tgz": "application/x-tar-gz",
		"tiff": "image/tiff",
		"tsv": "text/tab-separated-values",
		"txt": "text/plain",
		"wav": "audio/x-wav",
		"wma": "audio/x-ms-wma",
		"wmv": "video/x-ms-wmv",
		"xls": "application/vnd.ms-excel",
		"xlw": "application/vnd.ms-excel",
		"xml": "text/xml",
		"zip": "application/zip"
	},
	mimeType: "application/octet-stream",
	rangeSize: 500 * 1024,
	status: {
		200: "OK",
		201: "Created",
		202: "Accepted",
		203: "Non-Authoritative Information",
		204: "No Content",
		205: "Reset Content",
		206: "Partial Content",
		207: "Multi-Status",
		208: "Already Reported",
		226: "IM Used",
		300: "Multiple Choices",
		301: "Moved Permanently",
		302: "Found",
		303: "See Other",
		304: "Not Modified",
		305: "Use Proxy",
		307: "Temporary Redirect",
		308: "Permanent Redirect",
		400: "Bad Request",
		401: "Unauthorized",
		402: "Payment Required",
		403: "Forbidden",
		404: "Not Found",
		405: "Method Not Allowed",
		406: "Not Acceptable",
		407: "Proxy Authentication Required",
		408: "Request Timeout",
		409: "Conflict",
		410: "Gone",
		411: "Length Required",
		412: "Precondition Failed",
		413: "Payload Too Large",
		414: "URI Too Long",
		415: "Unsupported Media Type",
		416: "Range Not Satisfiable",
		417: "Expectation Failed",
		421: "Misdirected Request",
		422: "Unprocessable Entity",
		423: "Locked",
		424: "Failed Dependency",
		425: "Too Early",
		426: "Upgrade Required",
		428: "Precondition Required",
		429: "Too Many Requests",
		451: "Unavailable For Legal Reasons",
		500: "Internal Server Error",
		501: "Not Implemented",
		502: "Bad Gateway",
		503: "Service Unavailable",
		504: "Gateway Timeout",
		505: "HTTP Version Not Supported",
		506: "Variant Also Negotiates",
		507: "Insufficient Storage",
		508: "Loop Detected",
		509: "Bandwidth Limit Exceeded",
		510: "Not Extended",
		511: "Network Authentication Required"
	},
	statusCode: 200,
	tmp: (
		process.env.TMPDIR ||
		process.env.TEMP ||
		process.env.TMP ||
		(
			process.platform === "win32" ?
			/* istanbul ignore next */
			(process.env.SystemRoot || process.env.windir) + "\\temp" :
			"/tmp"
		)
	).replace(/([^:])[\/\\]+$/, "$1") + "/up-" + process.pid + "-",
	http: {
		port: 8080
	}
}
, hasOwn = defaultOpts.hasOwnProperty
, cookieRe = /[^!#-~]|[%,;\\]/g
, rangeRe = /^bytes=(\d*)-(\d*)^/

module.exports = createApp
createApp.setCookie = setCookie
createApp.getCookie = getCookie

function createApp(opts_) {
	var key
	, uses = []
	, opts = util.deepAssign(app.opts = {defaults: defaultOpts}, defaultOpts, opts_)

	event.asEmitter(app)
	opts._accept = accept(opts.accept)
	opts._encoding = accept(opts.encoding)

	Object.keys(opts.method).forEach(function(method) {
		app[opts.method[method]] = function() {
			var arr = uses.slice.call(arguments)
			if (typeof arr[0] === "function") {
				arr.unshift(null)
			}
			arr.unshift(method)
			return use.apply(app, arr)
		}
	})

	app.listen = listen
	app.static = createStatic
	app.use = use

	return app

	function app(req, res, _next) {
		var oldPath, oldUrl
		, tryCatch = true
		, usePos = 0
		, forwarded = req.headers[opts.ipHeader || "x-forwarded-for"]

		if (!res.send) {
			req.date = new Date()
			req.ip = forwarded ? forwarded.split(/[\s,]+/)[0] : req.connection && req.connection.remoteAddress
			req.opts = res.opts = opts
			req.res = res
			res.req = req
			res.send = send
			res.sendStatus = sendStatus

			// IE8-10 accept 2083 chars in URL
			// Sitemaps protocol has a limit of 2048 characters in a URL
			// Google SERP tool wouldn't cope with URLs longer than 1855 chars
			if (req.url.length > opts.maxURILength) {
				return sendError(res, opts, "URI Too Long")
			}

			req.content = content
			req.cookie = getCookie
			req.originalUrl = req.url

			res.cookie = setCookie
			res.link = setLink
			res.sendFile = sendFile
		}

		next()

		function next(err) {
			if (err) {
				return sendError(res, opts, err)
			}
			var method = uses[usePos]
			, path = uses[usePos + 1]
			, pos = usePos += 3

			if (method && method !== req.method || path && path !== req.url.slice(0, path.length)) {
				next()
			} else if (uses[pos - 1] === void 0) {
				if (typeof _next === "function") {
					_next()
				} else {
					res.sendStatus(404)
				}
			} else {
				method = uses[pos - 1]
				if (path) {
					oldPath = req.baseUrl
					oldUrl = req.url
					req.baseUrl = path
					req.url = req.url.slice(path.length) || "/"
				}
				if (tryCatch === true) {
					tryCatch = false
					try {
						method.call(app, req, res, path ? nextPath : next, opts)
					} catch(e) {
						return sendError(res, opts, e)
					}
				} else {
					method.call(app, req, res, path ? nextPath : next, opts)
				}
				if (pos === usePos) {
					tryCatch = true
				}
			}
		}
		function nextPath(e) {
			req.baseUrl = oldPath
			req.url = oldUrl
			next(e)
		}
	}

	function use(method, path) {
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
}

function createStatic(root_, opts_) {
	var root = path.resolve(root_)
	, opts = util.deepAssign({
		index: "index.html",
		maxAge: 31536000, // One year
		cache: {
			"cache.manifest": 0,
			"worker.js": 0
		}
	}, opts_)

	resolveFile("cache")
	resolveFile("headers")

	return function(req, res, next) {
		var file

		if (req.method !== "GET" && req.method !== "HEAD") {
			res.setHeader("Allow", "GET, HEAD")
			return res.sendStatus(405) // Method not allowed
		}

		if (req.url === "/" && !opts.index) {
			return res.sendStatus(404)
		}

		try {
			file = opts.url = path.resolve(root, (
				req.url === "/" ?
				opts.index :
				"." + decodeURIComponent(req.url.split("?")[0].replace(/\+/g, " "))
			))
		} catch (e) {
			return res.sendStatus(400)
		}

		if (file.slice(0, root.length) !== root) {
			return res.sendStatus(404)
		}
		res.sendFile(file, opts, function(err) {
			next()
		})
	}

	function resolveFile(name) {
		if (!opts[name]) return
		var file
		, map = opts[name]
		opts[name] = {}
		for (file in map) if (hasOwn.call(map, file)) {
			opts[name][file === "*" ? file : path.resolve(root, file)] = map[file]
		}
	}
}

function send(body, opts_) {
	var tmp
	, res = this
	, reqHead = res.req.headers
	, resHead = {}
	, negod = res.opts._accept(reqHead.accept || reqHead["content-type"])
	, opts = Object.assign({}, res.opts, negod, opts_)
	, format = negod.subtype || "json"
	, outStream = opts.stream || res

	if (!format) {
		return res.sendStatus(406) // Not Acceptable
	}

	tmp = opts.cache && opts.filename && opts.cache[opts.filename] || opts.maxAge
	if (typeof tmp === "number") {
		// max-age=N is relative to the time of the request
		resHead["Cache-Control"] = tmp > 0 ? "public, max-age=" + tmp : "no-cache, max-age=0"
	}

	if (opts.mtime && opts.mtime > Date.parse(reqHead["if-modified-since"])) {
		return res.sendStatus(304)
	}

	if (typeof body !== "string") {
		negod.select = opts && opts.select || res.req.url.split("$select")[1] || ""
		body = negod.o(body, negod)
		opts.mimeType = negod.rule
	}

	resHead["Content-Type"] = opts.mimeType + (
		opts.charset && opts.mimeType.slice(0, 5) === "text/" ? "; charset=" + opts.charset : ""
	)

	if (opts.size > 0 || opts.size === 0) {
		resHead["Content-Length"] = opts.size
		if (opts.size > opts.rangeSize) {
			resHead["Accept-Ranges"] = "bytes"
			resHead["Content-Length"] = opts.size

			if (tmp = reqHead.range && !reqHead["if-range"] && rangeRe.exec(reqHead.range)) {
				opts.start = range[1] ? +range[1] : range[2] ? opts.size - range[2] - 1 : 0
				opts.end = range[1] && range[2] ? +range[2] : opts.size - 1

				if (opts.start > opts.end || opts.end >= opts.size) {
					opts.start = 0
					opts.end = opts.size - 1
				} else {
					opts.statusCode = 206
					resHead["Content-Length"] = opts.end - opts.start
					resHead["Content-Range"] = "bytes " + opts.start + "-" + opts.end + "/" + opts.size
				}
			}
		}
	}

	if (opts.filename) {
		resHead["Content-Disposition"] = "attachment; filename=" + (
			typeof opts.filename === "function" ? opts.filename() : opts.filename
		)
	}

	negod = opts.compress && opts._encoding(reqHead["accept-encoding"])
	if (negod.match) {
		// Server may choose not to compress the body, if:
		//  - data is already compressed (some image format)
		//  - server is overloaded and cannot afford the computational overhead.
		//    Microsoft recommends not to compress if a server uses more than 80% of its computational power.
		delete resHead["Content-Length"]
		resHead["Content-Encoding"] = negod.match
		resHead["Vary"] = "Accept-Encoding"
		outStream = typeof negod.o === "string" ? require("zlib")[negod.o]() : negod.o()
		outStream.pipe(res)
	}

	if (opts.headers) Object.assign(resHead, opts.headers["*"], opts.headers[opts.url || res.req.url])
	res.writeHead(opts.statusCode, resHead)

	if (res.req.method == "HEAD") {
		return res.end()
	}

	if (opts.sendfile) {
		fs.createReadStream(opts.sendfile, {start: opts.start, end: opts.end}).pipe(outStream)
	} else {
		// Line and Paragraph separator needing to be escaped in JavaScript but not in JSON,
		// escape those so the JSON can be evaluated or directly utilized within JSONP.
		outStream.end(
			format === "json" ? body.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") :
			body
		)
	}
}

function sendFile(file, opts_, next_) {
	var res = this
	, opts = typeof opts_ === "function" ? (next = opts_) && {} : opts_ || {}
	, next = typeof next_ === "function" ? next_ : function(code) {
		res.sendStatus(code)
	}

	fs.stat(file, function(err, stat) {
		if (err) return next(404)
		if (stat.isDirectory()) return next(403)

		opts.mtime = stat.mtime
		opts.size = stat.size
		opts.filename = opts.download === true ? file.split("/").pop() : opts.download
		opts.mimeType = res.opts.mime[ file.split(".").pop() ] || res.opts.mimeType
		opts.sendfile = file

		res.send(file, opts)
	})
}

function sendStatus(code, message) {
	var res = this
	res.statusCode = code
	if (code > 199 && code != 204 && code != 304) {
		res.setHeader("Content-Type", "text/plain")
		message = (message || res.opts.status[code] || code) + "\n"
		res.setHeader("Content-Length", message.length)
		if ("HEAD" != res.req.method) {
			res.write(message)
		}
	}
	res.end()
}

function sendError(res, opts, e) {
	var message = typeof e === "string" ? e : e.message
	, map = opts.error && (opts.error[message] || opts.error[e.name]) || {}
	, error = {
		id: Math.random().toString(36).slice(2,10),
		time: res.req.date,
		code: map.code || e.code || 500,
		message: map.message || message
	}
	res.statusCode = error.code
	res.statusMessage = opts.status[error.code] || message

	res.send(error)

	opts.log.error(
		(e.stack || (e.name || "Error") + ": " + error.message).replace(":", ":" + error.id)
	)
}

function setLink(url, rel) {
	var res = this
	, existing = res.getHeader("link") || []

	if (!Array.isArray(existing)) {
		existing = [ existing ]
	}

	existing.push('<' + encodeURI(url) + '>; rel="' + rel + '"')

	res.setHeader("Link", existing)
}

function listen() {
	var exiting
	, server = this
	, opts = server.opts

	process.on("uncaughtException", function(e) {
		if (opts.log) opts.log.error(
			"\nUNCAUGHT EXCEPTION!\n" +
			(e.stack || (e.name || "Error") + ": " + (e.message || e))
		)
		else throw e
		;(opts.exit || exit).call(server, 1)
	})

	process.on("SIGINT", function() {
		if (exiting) {
			opts.log.info("\nKilling from SIGINT (got Ctrl-C twice)")
			return process.exit()
		}
		exiting = true
		opts.log.info("\nGracefully shutting down from SIGINT (Ctrl-C)")
		;(opts.exit || exit).call(server, 0)
	})

	process.on("SIGTERM", function() {
		opts.log.info("Gracefully shutting down from SIGTERM (kill)")
		;(opts.exit || exit).call(server, 0)
	})

	process.on("SIGHUP", function() {
		opts.log.info("Reloading configuration from SIGHUP")
		server.listen(true)
		server.emit("reload")
	})

	server.listen = opts.listen || function() {
		;["http", "https", "http2"].forEach(createNet)
	}

	server.listen()

	return server

	function createNet(proto) {
		var map = opts[proto]
		, net = server["_" + proto] && !server["_" + proto].close()
		if (!map || !map.port) return
		net = server["_" + proto] = require(proto)[
			proto == "http2" ? "createSecureServer" : "createServer"
		](map, map.redirect ? forceHttps : server)
		.listen(map.port, map.host || "0.0.0.0", function() {
			var addr = this.address()
			opts.log.info("Listening %s at %s:%s", proto, addr.address, addr.port)
			this.on("close", function() {
				opts.log.info("Stop listening %s at %s:%s", proto, addr.address, addr.port)
			})
			if (map.noDelay) this.on("connection", setNoDelay)
		})
		if (map.sessionReuse) {
			var sessionStore = {}
			, timeout = map.sessionTimeout || 300

			server["_" + proto]
			.on("newSession", function(id, data, cb) {
				sessionStore[id] = data
				cb()
			})
			.on("resumeSession", function(id, cb) {
				cb(null, sessionStore[id] || null)
			})
		}
	}

	function setNoDelay(socket) {
		if (socket.setNoDelay) socket.setNoDelay(true)
	}

	function forceHttps(req, res) {
		// Safari 5 and IE9 drop the original URI's fragment if a HTTP/3xx redirect occurs.
		// If the Location header on the response specifies a fragment, it is used.
		// IE10+, Chrome 11+, Firefox 4+, and Opera will all "reattach" the original URI's fragment after following a 3xx redirection.
		var port = opts.https && opts.https.port || 8443
		, host = (req.headers.host || "localhost").split(":")[0]
		, url = "https://" + (port == 443 ? host : host + ":" + port) + req.url

		res.writeHead(301, {"Content-Type": "text/html", "Location": url})
		res.end('Redirecting to <a href="' + url + '">' + url + '</a>')
	}

	function exit(code) {
		var softKill = util.wait(function() {
			opts.log.info("Everything closed cleanly")
			process.exit(code)
		}, 1)

		server.emit("beforeExit", softKill)

		try {
			if (server._http) server._http.close(softKill.wait()).unref()
			if (server._https) server._https.close(softKill.wait()).unref()
			if (server._http2) server._http2.close(softKill.wait()).unref()
		} catch(e) {}

		setTimeout(function() {
			opts.log.warn("Kill (timeout)")
			process.exit(code)
		}, opts.exitTime).unref()

		softKill()
	}
}


function setCookie(opts, value) {
	var res = this
	, existing = res.getHeader("set-cookie")
	, cookie = (typeof opts === "string" ? (opts = { name: opts }) : opts).name
	+ ("=" + value).replace(cookieRe, encodeURIComponent)
	+ (opts.maxAge   ? "; Expires=" + new Date(opts.maxAge > 0 ? Date.now() + (opts.maxAge*1000) : 0).toUTCString() : "")
	+ (opts.path     ? "; Path=" + opts.path : "")
	+ (opts.domain   ? "; Domain=" + opts.domain : "")
	+ (opts.secure   ? "; Secure" : "")
	+ (opts.httpOnly ? "; HttpOnly" : "")
	+ (opts.sameSite ? "; SameSite=" + opts.sameSite : "")

	if (Array.isArray(existing)) {
		existing.push(cookie)
	} else {
		res.setHeader("Set-Cookie", existing ? [existing, cookie] : cookie)
	}
}

function getCookie(opts) {
	var req = this
	, name = (typeof opts === "string" ? (opts = { name: opts }) : opts).name
	, junks = ("; " + req.headers.cookie).split("; " + name + "=")

	if (junks.length > 2) {
		;(opts.path || "").split("/").map(function(val, key, arr) {
			var map = {
				name: name,
				maxAge: -1,
				path: arr.slice(0, key + 1).join("/")
			}
			, domain = opts.domain
			req.res.cookie(map, "")
			if (domain) {
				map.domain = domain
				req.res.cookie(map, "")

				if (domain !== (domain = domain.replace(/^[^.]+(?=\.(?=.+\.))/, "*"))) {
					map.domain = domain
					req.res.cookie(map, "")
				}
			}
		})
		req.opts.log.warn("Cookie fixation detected: %s", req.headers.cookie)
	} else try {
		return decodeURIComponent((junks[1] || "").split(";")[0])
	} catch(e) {
		req.opts.log.warn("Invalid cookie '%s' in: %s", name, req.headers.cookie)
	}
	return ""
}


