
var httpServer, httpsServer
, util = require("../lib/util")



module.exports = initProcess



function initProcess(opts) {
	var exiting
	, app = this
	if (!opts) opts = {}

	process.on("uncaughtException", function(e) {
		;(opts.errorLog || console.error)(
			"\nUNCAUGHT EXCEPTION!\n" +
			(e.stack || (e.name || "Error") + ": " + (e.message || e))
		)
		;(opts.exit || exit).call(app, 1)
	})

	process.on("SIGINT", function() {
		if (exiting) exit(0)
		exiting = true
		console.log("\nGracefully shutting down from SIGINT (Ctrl-C)")
		;(opts.exit || exit).call(app, 0)
	})

	process.on("SIGTERM", function() {
		console.log("\nGracefully shutting down from SIGTERM (kill)")
		;(opts.exit || exit).call(app, 0)
	})

	process.on("SIGHUP", function() {
		console.log("\nReloading configuration from SIGHUP")
		;(opts.start || start).call(app, true)
	})

	app.start = opts.start || start

	return app
}

function start(reload) {
	var app = this
	, options = app.options
	, httpPort = process.env.PORT || 8080
	, httpsPort = process.env.HTTPS_PORT || 8443

	if (httpServer)  httpServer.close()
	if (httpsServer) httpsServer.close()
	httpServer = httpsServer = null

	console.log("START", app, options)

	if (options.https) {
		httpsServer = require("https").createServer(options.https, this)
		.listen(httpsPort, listening)
		.on("connection", setNoDelay)
	}

	httpServer = require("http")
	.createServer(options.https && options.forceHttpsthis ? forceHttps : this)
	.listen(httpPort, listening)
	.on("connection", setNoDelay)
}

function exit(code) {
	var app = this
	, softKill = util.wait(kill.ttl(5000, kill), 1)

	app.emit("beforeExit", softKill)

	try {
		if (httpServer)  httpServer.close(softKill.wait())
		if (httpsServer) httpsServer.close(softKill.wait())
	} catch(e) {}

	softKill()

	function kill() {
		process.exit(code)
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


