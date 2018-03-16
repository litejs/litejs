
!function(exports) {
	"use strict";
	var sep = exports.sep = "/"
	exports.normalize = normalize
	exports.relative = relative
	exports.resolve = resolve

	function normalize(path) {
		var c
		, SLASH = 47
		, DOT = 46
		, res = path
		, abs = res.charCodeAt(0) == SLASH
		, len = res.length
		, i = len
		, cut = len
		, up = 0
		, last = SLASH

		for (; i > 0; ) {
			c = res.charCodeAt(--i)
			if (c === SLASH) {
				if (cut === 0) {
					cut = i
				} else if (last !== SLASH && up > 0) {
					up--
				}
			} else if (last === SLASH) {
				if (c === DOT) {
					if (i > 0) {
						c = res.charCodeAt(--i)
						if (c === DOT && (i === 0 || res.charCodeAt(i - 1) === SLASH)) {
							last = SLASH
							i--
							up++
						} else if (c !== SLASH) {
							cut = 0
						}
						continue
					} else {
						break
					}
				}
				if (up === 0 && cut > 0) {
					if (len === cut) {
						if (cut > i + 2) {
							res = res.slice(0, res.charCodeAt(len - 1) === SLASH ? i + 2 : i + 1)
						}
					} else if (cut > i + 1) {
						res = res.slice(0, i + 1) + res.slice(cut)
					}
					cut = 0
				}
			}
			last = c
		}
		if (cut > 0 && i === 0) {
			res = res.slice(abs ? cut : cut + 1)
		}
		return res
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
			if ((out[i--] = clear(args[i])).charCodeAt(0) === 47) {
				out.splice(0, i + 1)
				i = 0
			}
		}
		if (!out[0]) out[0] = process.cwd()

		return normalize(out.join(sep))
	}

	function clear(path) {
		if (typeof path !== "string") {
			throw new TypeError("Path must be a string. Got " + typeof path)
		}
		return path.replace(/\/+$/, "")
	}
}(this)



