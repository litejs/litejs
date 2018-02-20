
!function(exports) {
	"use strict";
	var sep = exports.sep = "/"
	exports.normalize = normalize
	exports.relative = relative
	exports.resolve = resolve

	function normalize(path) {
		var arr = path.split(/\/+/)
		, i = arr.length
		, up = 0
		, abs = path.charAt(0) == "/"
		for (; i--; ) {
			if (arr[i] == "." || arr[i] == ".." && ++up || up && up--) {
				arr.splice(i, 1)
			}
		}
		if (!abs) for (; up--; ) {
			arr.unshift("..")
		}
		return (abs && arr[0] ? sep : "") + arr.join(sep)
	}

	function relative(from, to) {
		from = normalize(clear(from))
		to = normalize(clear(to))

		if (from === to) return ""

		from = from.split(sep)
		to = to.split(sep)

		for (var common, i = common = from.length; i--; ) {
			if (from[i] !== to[i]) common = i
			from[i] = ".."
		}

		return from.slice(common).concat(to.slice(common)).join(sep)
	}

	function resolve() {
		var args = arguments
		, i = args.length
		, out = []

		for (; i; ) {
			if ((out[i--] = clear(args[i])).charAt(0) == "/") {
				out.splice(0, i + 1)
				i = 0
			}
		}
		if (!out[0]) out[0] = process.cwd()

		return normalize(out.join(sep))
	}

	function clear(path) {
		if (typeof path != "string") {
			throw new TypeError("Path must be a string. Received " + typeof path)
		}
		return path.replace(/\/+$/, "")
	}
}(this)



