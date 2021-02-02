
!function(exports) {
	"use strict";
	var sep = exports.sep = "/"
	exports.dirname = dirname
	exports.normalize = normalize
	exports.relative = relative
	exports.resolve = resolve

	function dirname(path) {
		for (var skip = 0, i = path.length; i > 0; ) {
			if (path.charCodeAt(--i) !== 47) {
				if (skip === 0) skip = i
			} else if (skip > 0) break
		}
		return i > 0 ? path.slice(0, i) : path.charCodeAt(0) === 47 ? "/" : "."
	}

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

	function relative(_from, _to) {
		if (_from === _to) return ""

		var last, code1, code2
		, from = normalize(clear(_from))
		, to = normalize(clear(_to))
		, i = 0
		, arr = []

		if (from === to) return ""

		for (; code1 === code2; ) {
			code1 = from.charCodeAt(i)
			if (code1 === 47) last = i
			code2 = to.charCodeAt(i++)
		}
		if (code1 === code1) {
			code1 = from.length
			for (i = last++; i < code1; ) {
				if (from.charCodeAt(i++) === 47) arr.push("..")
			}
		} else {
			last = i
		}
		if (code2 === code2) {
			arr.push(to.slice(last))
		}

		return arr.join(sep)
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
		for (var len = path.length - 1, i = len; path.charCodeAt(i) === 47; i--);
		return i !== len ? path.slice(0, i < 0 ? 1 : i + 1) : path
	}
}(this) // jshint ignore:line



