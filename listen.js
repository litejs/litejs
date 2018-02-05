
var util = require("../lib/util")


module.exports = listen


function listen(port) {
	var exiting
	, app = this
	, options = app.options

	process.on("uncaughtException", function(e) {
		;(options.errorLog || console.error)(
			"\nUNCAUGHT EXCEPTION!\n" +
			(e.stack || (e.name || "Error") + ": " + (e.message || e))
		)
		;(options.exit || exit).call(app, 1)
	})

	process.on("SIGINT", function() {
		if (exiting) {
			console.log("\nKilling from SIGINT (got Ctrl-C twice)")
			return process.exit()
		}
		exiting = true
		console.log("\nGracefully shutting down from SIGINT (Ctrl-C)")
		;(options.exit || exit).call(app, 0)
	})

	process.on("SIGTERM", function() {
		console.log("\nGracefully shutting down from SIGTERM (kill)")
		;(options.exit || exit).call(app, 0)
	})

	process.on("SIGHUP", function() {
		console.log("\nReloading configuration from SIGHUP")
		app.listen(port, true)
	})

	app.listen = options.listen || _listen

	app.listen(port)

	return app
}

function _listen(port) {
	var app = this
	, options = app.options
	, httpPort = process.env.PORT || port || 8080
	, httpsPort = process.env.HTTPS_PORT || 8443
	, secure = options.https || options.http2
	, msg = "Listening"
	, listenCount = 0

	if (app.httpServer)  app.httpServer.close()
	if (app.httpsServer) app.httpsServer.close()
	app.httpServer = app.httpsServer = null

	app.httpServer = require("http")
	.createServer(secure && options.forceHttps ? forceHttps : this)
	.listen(httpPort, addMsg("http"))
	.on("connection", setNoDelay)
	.on("close", logClose("http"))

	if (secure) {
		app.httpsServer = (
			options.http2 ?
			require("http2").createSecureServer(secure, this) :
			require("https").createServer(secure, this)
		)
		.listen(httpsPort, options.http2 ? addMsg("http2") : addMsg("https"))
		.on("connection", setNoDelay)
		.on("close", logClose(options.http2 ? "http2" : "https"))

		if (secure.sessionReuse) {
			var sessionStore = {}
			, timeout = secure.sessionTimeout || 300

			app.httpsServer
			.on("newSession", function(id, data, cb) {
				sessionStore[id] = data
				cb()
			})
			.on("resumeSession", function(id, cb) {
				cb(null, sessionStore[id] || null)
			})
		}
	}

	function addMsg(proto) {
		listenCount++
		return function() {
			var addr = this.address()
			msg += " " + proto + " at " + addr.address + ":" + addr.port
			if (!--listenCount) {
				console.log(msg)
			}
		}
	}
	function logClose(proto) {
		return function() {
			console.log("Stop listening " + proto)
		}
	}
}

function exit(code) {
	var app = this
	, softKill = util.wait(function() {
		console.log("Everything closed cleanly")
		process.exit(code)
	}, 1)

	app.emit("beforeExit", softKill)

	try {
		if (app.httpServer)  app.httpServer.close(softKill.wait())
		if (app.httpsServer) app.httpsServer.close(softKill.wait())
	} catch(e) {}

	setTimeout(function() {
		console.log("\nKill (timeout)")
		process.exit(code)
	}, 5000).unref()

	softKill()
}

function setNoDelay(socket) {
	socket.setNoDelay(true)
}

function forceHttps(req, res) {
	var port = process.env.HTTPS_PORT || 8443
	, host = (req.headers.host || "localhost").split(":")[0]
	, url = "https://" + (port == 443 ? host : host + ":" + port) + req.url

	res.writeHead(301, {"Content-Type": "text/html", "Location": url})
	res.end('Redirecting to <a href="' + url + '">' + url + '</a>')
}


