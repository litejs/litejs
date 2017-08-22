
var util = require("../lib/util")


module.exports = initProcess


function initProcess() {
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
		;(options.listen || listen).call(app, true)
	})

	app.listen = options.listen || listen

	return app
}

function listen(port) {
	var app = this
	, options = app.options
	, httpPort = process.env.PORT || port || 8080
	, httpsPort = process.env.HTTPS_PORT || 8443
	, secure = options.https || options.http2

	if (app.httpServer)  app.httpServer.close()
	if (app.httpsServer) app.httpsServer.close()
	app.httpServer = app.httpsServer = null

	app.httpServer = require("http")
	.createServer(secure && options.forceHttps ? forceHttps : this)
	.listen(httpPort, listening)
	.on("connection", setNoDelay)

	if (secure) {
		app.httpsServer = (
			options.http2 ?
			require("http2").createSecureServer(secure, this) :
			require("https").createServer(secure, this)
		)
		.listen(httpsPort, listening)
		.on("connection", setNoDelay)
	}
}

function exit(code) {
	var app = this
	, softKill = util.wait(kill.ttl(5000, kill), 1)

	app.emit("beforeExit", softKill)

	try {
		if (app.httpServer)  app.httpServer.close(softKill.wait())
		if (app.httpsServer) app.httpsServer.close(softKill.wait())
	} catch(e) {}

	softKill()

	function kill() {
		console.log("\nKill (timeout)")
		process.exit()
	}
}

function listening() {
	var addr = this.address()
	console.log("Listening at " + addr.address + ":" + addr.port)
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


