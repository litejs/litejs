
var util = require("../lib/util")
, log = require("../lib/log")("server")


module.exports = listen


function listen() {
	var exiting
	, server = this
	, options = server.options

	process.on("uncaughtException", function(e) {
		;(options.errorLog || log.error)(
			"\nUNCAUGHT EXCEPTION!\n" +
			(e.stack || (e.name || "Error") + ": " + (e.message || e))
		)
		;(options.exit || exit).call(server, 1)
	})

	process.on("SIGINT", function() {
		if (exiting) {
			log.info("Killing from SIGINT (got Ctrl-C twice)")
			return process.exit()
		}
		exiting = true
		log.info("Gracefully shutting down from SIGINT (Ctrl-C)")
		;(options.exit || exit).call(server, 0)
	})

	process.on("SIGTERM", function() {
		log.info("Gracefully shutting down from SIGTERM (kill)")
		;(options.exit || exit).call(server, 0)
	})

	process.on("SIGHUP", function() {
		log.info("Reloading configuration from SIGHUP")
		server.listen(true)
	})

	server.listen = options.listen || _listen

	server.listen()

	return server
}

function _listen() {
	var server = this
	, options = server.options
	, httpsOptions = options.https || options.http2

	if (server.httpServer)  server.httpServer.close()
	if (server.httpsServer) server.httpsServer.close()
	server.httpServer = server.httpsServer = null

	if (options.httpPort) {
		server.httpServer = require("http")
		.createServer(options.forceHttps ? forceHttps : this)
		.listen(
			options.httpPort,
			options.httpHost || "0.0.0.0",
			onListen("http")
		)
	}

	if (httpsOptions && httpsOptions.port) {
		server.httpsServer = (
			options.http2 ?
			require("http2").createSecureServer(httpsOptions, this) :
			require("https").createServer(httpsOptions, this)
		)
		.listen(
			httpsOptions.port,
			options.httpsHost || options.httpHost || "0.0.0.0",
			onListen(options.http2 ? "http2" : "https")
		)

		if (httpsOptions.sessionReuse) {
			var sessionStore = {}
			, timeout = httpsOptions.sessionTimeout || 300

			server.httpsServer
			.on("newSession", function(id, data, cb) {
				sessionStore[id] = data
				cb()
			})
			.on("resumeSession", function(id, cb) {
				cb(null, sessionStore[id] || null)
			})
		}
	}

	function onListen(proto) {
		return function() {
			var addr = this.address()
			log.info("Listening %s at %s:%s", proto, addr.address, addr.port)
			this
			.on("close", function() {
				log.info("Stop listening %s at %s:%s", proto, addr.address, addr.port)
			})
			.on("connection", setNoDelay)
		}
	}

	function setNoDelay(socket) {
		socket.setNoDelay(true)
	}

	function forceHttps(req, res) {
		var port = httpsOptions && httpsOptions.port || 8443
		, host = (req.headers.host || "localhost").split(":")[0]
		, url = "https://" + (port == 443 ? host : host + ":" + port) + req.url

		res.writeHead(301, {"Content-Type": "text/html", "Location": url})
		res.end('Redirecting to <a href="' + url + '">' + url + '</a>')
	}
}

function exit(code) {
	var server = this
	, softKill = util.wait(function() {
		log.info("Everything closed cleanly")
		process.exit(code)
	}, 1)

	server.emit("beforeExit", softKill)

	try {
		if (server.httpServer) server.httpServer.close().unref()
		if (server.httpsServer) server.httpsServer.close().unref()
	} catch(e) {}

	setTimeout(function() {
		log.warn("Kill (timeout)")
		process.exit(code)
	}, 5000).unref()

	softKill()
}


