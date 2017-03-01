


module.exports = initProcess

function initProcess(opts) {
	var app = this

	process.on("uncaughtException", function(err) {
		console.error("\nCaught exception: " + err.stack)
		;(opts.exit || kill)(1)
	})

	process.on("SIGINT", function() {
		console.log("\nGracefully shutting down from SIGINT (Ctrl-C)")
		;(opts.exit || kill)(0)
	})

	process.on("SIGTERM", function() {
		console.log("\nGracefully shutting down from SIGTERM (kill)")
		;(opts.exit || kill)(0)
	})

	process.on("SIGHUP", function() {
		console.log("\nReloading configuration from SIGHUP")
		opts.start(true)
	})

	return app
}

function kill(code) {
	process.exit(code)
}

