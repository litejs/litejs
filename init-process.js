
var server



module.exports = initProcess



function initProcess(opts) {
	var app = this
	if (!opts) opts = {}

	process.on("uncaughtException", function(e) {
		;(opts.errorLog || console.error)(
			"\nUNCAUGHT EXCEPTION!\n" +
			(e.stack || (e.name || "Error") + ": " + (e.message || e))
		)
		;(opts.exit || exit).call(app, 1)
	})

	process.on("SIGINT", function() {
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
	var port = process.env.PORT || 8080

	if (server) {
		server.close()
	}

	server = require("http").createServer(this)
	.listen(port, function() {
		var addr = server.address()
		console.log("Listening at " + addr.address + ":" + addr.port)
	})
	.on("connection", function (socket) {
		socket.setNoDelay(true)
	})
}

function exit(code) {
	process.exit(code)
}

