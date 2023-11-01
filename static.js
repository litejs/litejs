
var path = require("path")
, util = require("./util")
, hasOwn = {}.hasOwnProperty

module.exports = createStatic

function createStatic(root, opts) {
	root = path.resolve(root)
	opts = util.deepAssign({
		fallthrough: true,
		index: "index.html",
		maxAge: "1 year",
		cache: {
			"cache.manifest": 0
		}
	}, opts)

	resolveFile("cache", util.num)
	resolveFile("headers")

	return function(req, res, next) {
		var file

		if (req.method !== "GET" && req.method !== "HEAD") {
			if (opts.fallthrough !== true) res.setHeader("Allow", "GET, HEAD")
			return fall(405) // Method not allowed
		}

		if (req.url === "/") {
			if (!opts.index) return fall(404)
			if (typeof opts.index === "function") return opts.index(req, res, next, opts)
			file = path.resolve(root, opts.index)
		} else try {
			file = path.resolve(root, "." + decodeURIComponent(req.url.split("?")[0].replace(/\+/g, " ")))
		} catch (e) {
			return fall(400)
		}

		if (file.slice(0, root.length) !== root) {
			return fall(404)
		}
		res.sendFile(file, opts, fall)
		function fall(err) {
			next(opts.fallthrough === true ? null : err)
		}
	}

	function resolveFile(name, util) {
		if (!opts[name]) return
		var file
		, map = opts[name]
		opts[name] = {}
		for (file in map) if (hasOwn.call(map, file)) {
			opts[name][file === "*" ? file : path.resolve(root, file)] = util ? util(map[file]) : map[file]
		}
	}
}

