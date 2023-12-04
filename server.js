
var defaultOpts = {
	accept: {
		"application/json;filename=;select=;space=": function(data, negod) {
			return JSON.stringify(
				data,
				negod.select ? negod.select.split(",") : null,
				+negod.space || negod.space
			)
		},
		// RFC 4180 optional parameters: charset, header
		"text/csv;br=\"\r\n\";delimiter=\",\";fields=;filename=;header=;NULL=;select=": require("./csv.js").encode,
		"application/sql;fields=;filename=;NULL=NULL;select=;table=table": function(data, negod) {
			negod.re = /\D/
			negod.br = "),\n("
			negod.prefix = "INSERT INTO " +
			negod.table + (negod.fields ? " (" + negod.fields + ")" : "") + " VALUES ("
			negod.postfix = ");"
			return require("./csv.js").encode(data, negod)
		}
	},
	catch: sendError,
	charset: "UTF-8",
	compress: {
		"br": "createBrotliCompress",
		"deflate;q=0.1": "createDeflate",
		"gzip;q=0.2": "createGzip"
	},
	error: {
		"URIError": { code: 400 }
	},
	exitTime: 5000,
	ipHeader: "x-forwarded-for",
	protoHeader: "x-forwarded-proto",
	log: console,
	maxURILength: 2000,
	method: {
		DELETE: "del",
		GET: "get",
		PATCH: "patch",
		POST: "post",
		PUT: "put"
	},
	mime: {
		css: "text/css",
		csv: "text/csv",
		cur: "image/vnd.microsoft.icon",
		doc: "application/msword",
		epub: "application/epub+zip",
		gif: "image/gif",
		gz: "application/x-gzip",
		htm: "text/html",
		html: "text/html",
		ico: "image/x-icon",
		jar: "application/java-archive",
		jpeg: "image/jpeg",
		jpg: "image/jpeg",
		js: "text/javascript",
		json: "application/json",
		m3u: "audio/x-mpegurl",
		manifest: "text/cache-manifest",
		midi: "audio/midi",
		mjs: "text/javascript",
		mp3: "audio/mpeg",
		mp4: "video/mp4",
		mpeg: "video/mpeg",
		mpg: "video/mpeg",
		mpga: "audio/mpeg",
		pdf: "application/pdf",
		pgp: "application/pgp",
		png: "image/png",
		ppz: "application/vnd.ms-powerpoint",
		ps: "application/postscript",
		rar: "application/x-rar-compressed",
		rtf: "text/rtf",
		sh: "application/x-sh",
		sql: "application/sql",
		svg: "image/svg+xml",
		tgz: "application/x-tar-gz",
		tiff: "image/tiff",
		ttf: "font/ttf",
		txt: "text/plain",
		wav: "audio/x-wav",
		weba: "audio/webm",
		webm: "video/webm",
		webp: "image/webp",
		woff2: "font/woff2",
		woff: "font/woff",
		xls: "application/vnd.ms-excel",
		xlw: "application/vnd.ms-excel",
		xml: "text/xml",
		zip: "application/zip"
	},
	rangeSize: 500 * 1024,
	status: Object.assign({}, require("http").STATUS_CODES),
	http: {
		port: 8080
	}
}
, fs = require("fs")
, content = require("./content")
, event = require("./event")
, util = require("./util")
, cookieRe = /[^!#-~]|[%,;\\]/g
, rangeRe = /^bytes=(\d*)-(\d*)$/
, tmpDate = new Date()

module.exports = createServer
createServer.getCookie = getCookie
createServer.setCookie = setCookie

function createServer(opts_) {
	var uses = []
	, opts = util.deepAssign(app.opts = {defaults: defaultOpts}, defaultOpts, opts_)

	event.asEmitter(app)
	if (!opts._accept) opts._accept = require("./accept").accept(opts.accept)
	if (!opts._compress) opts._compress = opts.compress && require("./accept").accept(opts.compress)

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

	Object.keys(opts.status).forEach(function(code) {
		if (code > 399 && !opts.error[opts.status[code]]) opts.error[opts.status[code]] = { code: +code }
	})

	app.listen = listen
	app.use = use

	return app

	function app(req, res, _next) {
		var oldPath, oldUrl
		, tryCatch = true
		, usePos = 0
		, forwarded = req.headers[opts.ipHeader]
		, reqMethod = req.method === "HEAD" ? "GET" : req.method
		, socket = req.socket || {}

		if (!res.send) {
			req.date = new Date()
			req.ip = forwarded ? forwarded.trim().split(/[\s,]+/)[0] : socket.remoteAddress
			req.opts = res.opts = opts
			req.protocol = forwarded && trustedProxy(socket.remoteAddress) ? req.headers[opts.protoHeader] : socket.encrypted ? "https" : "http"
			req.publicUrl = opts.publicUrl || req.protocol + "://" + req.headers.host
			req.res = res
			req.secure = req.protocol === "https"
			res.isHead = req.method === "HEAD"
			res.req = req
			res.send = send
			res.sendStatus = sendStatus

			// IE8-10 accept 2083 chars in URL
			// Sitemaps protocol has a limit of 2048 characters in a URL
			// Google SERP tool wouldn't cope with URLs longer than 1855 chars
			if (req.url.length > opts.maxURILength) {
				return opts.catch("URI Too Long", req, res, opts)
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
				return opts.catch(err, req, res, opts)
			}
			var method = uses[usePos]
			, path = uses[usePos + 1]
			, pos = usePos += 3

			if (method && method !== reqMethod || path && path !== req.url.slice(0, path.length)) {
				next()
			} else if (uses[pos - 1] === void 0) {
				if (typeof _next === "function") {
					_next()
				} else {
					opts.catch(404, req, res, opts)
				}
			} else {
				method = uses[pos - 1]
				if (path) {
					oldPath = req.baseUrl
					oldUrl = req.url
					req.baseUrl = path
					req.url = req.url === path ? "/" : req.url.slice(path.slice(-1) === "/" ? path.length - 1 : path.length)
				}
				if (tryCatch === true) {
					tryCatch = false
					try {
						method.call(app, req, res, path ? nextPath : next, opts)
					} catch(e) {
						return opts.catch(e, req, res, opts)
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
		var arr = Array.from(arguments)
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

	function trustedProxy(ip) {
		return !Array.isArray(opts.trustProxy) || opts.trustProxy.some(util.ipInNet.bind(null, ip))
	}
}

function send(body, opts_) {
	var tmp
	, res = this
	, reqHead = res.req.headers
	, resHead = {}
	, negod = res.opts._accept(reqHead.accept || reqHead["content-type"] || "*/*")
	, opts = Object.assign({
		statusCode: res.statusCode,
		mimeType: negod.rule
	}, res.opts, negod, opts_)
	, outStream = opts.stream || res

	if (!negod.match) {
		return res.sendStatus(406) // Not Acceptable
	}

	tmp = util.num(opts.cache && opts.sendfile && opts.cache[opts.sendfile], opts.maxAge)
	if (typeof tmp === "number") {
		// max-age=N is relative to the time of the request
		resHead["Cache-Control"] = tmp > 0 ? "public, max-age=" + (0|(tmp/1000)) : "no-cache, max-age=0"
	}

	if (opts.mtime && opts.mtime > Date.parse(reqHead["if-modified-since"])) {
		return res.sendStatus(304)
	}

	if (typeof body !== "string") {
		negod.select = opts && opts.select || res.req.url.split("$select")[1] || ""
		body = negod.o(body, negod)
	}

	resHead["Content-Type"] = opts.mimeType + (
		opts.charset && opts.mimeType.slice(0, 5) === "text/" ? "; charset=" + opts.charset : ""
	)

	if (opts.size >= 0) {
		resHead["Content-Length"] = opts.size
		if (opts.size > opts.rangeSize) {
			resHead["Accept-Ranges"] = "bytes"

			if ((tmp = reqHead.range && !reqHead["if-range"] && rangeRe.exec(reqHead.range))) {
				opts.start = tmp[1] ? +tmp[1] : tmp[2] ? opts.size - tmp[2] - 1 : 0
				opts.end = tmp[1] && tmp[2] ? +tmp[2] : opts.size - 1

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

	negod = opts._compress && opts._compress(reqHead["accept-encoding"])
	if (negod && negod.match) {
		// Server may choose not to compress the body, if:
		//  - data is already compressed (some image format)
		//  - server is overloaded and cannot afford the computational overhead.
		//    Microsoft recommends not to compress if a server uses more than 80% of its computational power.
		delete resHead["Content-Length"]
		resHead["Content-Encoding"] = negod.match
		resHead.Vary = "Accept-Encoding"
		outStream = typeof negod.o === "string" ? require("zlib")[negod.o]() : negod.o()
		outStream.pipe(res)
	}

	if (opts.headers) Object.assign(resHead, opts.headers["*"], opts.headers[res.req.originalUrl])
	res.writeHead(opts.statusCode || 200, resHead)

	if (res.isHead) {
		return res.end()
	}

	if (opts.sendfile) {
		fs.createReadStream(opts.sendfile, {start: opts.start, end: opts.end}).pipe(outStream)
	} else {
		outStream.end(body)
	}
}

function sendFile(file, opts_, next_) {
	var res = this
	, opts = typeof opts_ === "function" ? (next_ = opts_) && {} : opts_ || {}
	, next = typeof next_ === "function" ? next_ : function(code) {
		sendStatus.call(res, code)
	}

	fs.stat(file, function(err, stat) {
		if (err) return next(404)
		if (stat.isDirectory()) return next(403)

		opts.mtime = stat.mtime
		opts.size = stat.size
		opts.filename = opts.download === true ? file.split("/").pop() : opts.download
		opts.mimeType = res.opts.mime[ file.split(".").pop() ] || "application/octet-stream"
		opts.sendfile = file

		send.call(res, file, opts)
	})
}

function sendStatus(code, message) {
	var res = this
	res.statusCode = code
	if (code > 199 && code !== 204 && code !== 205 && code !== 304) {
		message = (message || res.opts.status[code] || code) + "\n"
		res.setHeader("Content-Length", message.length)
		res.setHeader("Content-Type", "text/plain")
		if (!res.isHead) {
			res.write(message)
		}
	}
	res.end()
}

function sendError(e, req, res, opts) {
	var map = typeof e === "string" ? opts.error[e] || { message: e } : typeof e === "number" ? { code: e } : e
	, error = {
		id: Math.random().toString(36).slice(2, 10),
		time: req.date,
		code: map.code || e.code || 500
	}
	res.statusCode = error.code
	res.statusMessage = error.message = opts.status[error.code] || "Error " + error.code
	res.send(error)

	opts.log.error(
		(Array.isArray(e.stack) ? e.stack.join("\n") : e.stack || (e.name || "Error") + ": " + error.message).replace("Error:", "Error:" + error.id)
	)
}

function setLink(rel, url) {
	var res = this
	, existing = res.getHeader("link") || []

	if (!Array.isArray(existing)) {
		existing = [ existing ]
	}

	existing.push("<" + encodeURI(url) + ">; rel=\"" + rel + "\"")

	res.setHeader("Link", existing)
}

function listen() {
	var exiting
	, server = this
	, opts = server.opts

	process.on("uncaughtException", function(e) {
		if (opts.log) opts.log.error(
			"\nUNCAUGHT EXCEPTION!\n" +
			(Array.isArray(e.stack) ? e.message + "\n" + e.stack.join("\n") : e.stack || (e.name || "Error") + ": " + (e.message || e))
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
		["http", "https", "http2"].forEach(createNet)
	}

	server.listen()

	return server

	function createNet(proto) {
		if (server["_" + proto]) server["_" + proto].close()
		var map = opts[proto]
		if (!map || !map.port) return
		var net = server["_" + proto] = (
			proto === "http" ?
			require(proto).createServer(map.redirect ? forceHttps : server) :
			require(proto).createSecureServer(map, map.redirect ? forceHttps : server)
		)
		.listen(map.port, map.host || "0.0.0.0", function() {
			var addr = this.address()
			opts.log.info("Listen %s at %s:%s", proto, addr.address, addr.port)
			this.on("close", function() {
				opts.log.info("Stop listening %s at %s:%s", proto, addr.address, addr.port)
			})
			if (map.noDelay) this.on("connection", setNoDelay)
		})
		if (map.sessionReuse) {
			var sessionStore = {}

			net
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
		, url = "https://" + (port === 443 ? host : host + ":" + port) + req.url

		res.writeHead(301, {"Content-Type": "text/html", "Location": url})
		res.end("Redirecting to <a href=\"" + url + "\">" + url + "</a>")
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
	, existing = res.getHeader("set-cookie") || ""
	, name = (typeof opts === "string" ? (opts = { name: opts }) : opts).name
	, cookie = (name + "=" + value).replace(cookieRe, encodeURIComponent) +
	(opts.maxAge   ? "; Expires=" + (tmpDate.setTime(opts.maxAge < 1 ? 0 : Date.now() + util.num(opts.maxAge)), tmpDate).toUTCString() : "") +
	(opts.path     ? "; Path=" + opts.path : "") +
	(opts.domain   ? "; Domain=" + opts.domain : "") +
	(opts.secure   ? "; Secure" : "") +
	(opts.httpOnly ? "; HttpOnly" : "") +
	(opts.sameSite ? "; SameSite=" + opts.sameSite : "")

	if (Array.isArray(existing)) {
		for (var i = existing.length; i--; ) if (overRideCookie(name, existing[i])) existing.splice(i, 1)
		existing.push(cookie)
	} else {
		res.setHeader("Set-Cookie", overRideCookie(name, existing) ? cookie : [ existing, cookie ])
	}
}

function overRideCookie(name, cookie) {
	return !cookie || cookie.slice(0, name.length + 1) === name + "="
}

function getCookie(opts) {
	var req = this
	, name = (typeof opts === "string" ? (opts = { name: opts }) : opts).name
	, junks = ("; " + req.headers.cookie).split("; " + name + "=")

	if (junks.length > 2) {
		req.res.setHeader("Clear-Site-Data", "\"cookies\"")
		req.opts.log.warn("%s %s %s Cookie fixation: %s", req.ip, req.method, req.originalUrl, req.headers.cookie)
	} else try {
		junks = decodeURIComponent((junks[1] || "").split(";")[0])
		if (!opts.re || opts.re.test(junks)) return junks
	} catch(e) {
		req.opts.log.warn("Invalid cookie '%s' in: %s", name, req.headers.cookie)
	}
	return ""
}


