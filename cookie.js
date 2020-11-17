
var valueEsc = /[^!#-~]|[%,;\\]/g

exports.get = getCookie
exports.set = setCookie
exports.escape = escapeCookie
exports.log = console

function getCookie(name, opts) {
	if (typeof name === "object") {
		opts = name
		name = opts.name
	} else {
		opts = opts || {}
	}

	var req = this
	, junks = ("; " + req.headers.cookie).split("; " + name + "=")

	if (junks.length > 2) {
		;(opts.path || "").split("/").map(function(val, key, arr) {
			var path = arr.slice(0, key+1).join("/")
			, domain = opts.domain
			req.res.cookie(name, "", {ttl: -1, path: path})
			if (domain) {
				req.res.cookie(name, "", {ttl: -1, path: path, domain: domain})

				if (domain !== (domain = domain.replace(/^[^.]+(?=\.(?=.+\.))/, "*"))) {
					req.res.cookie(name, "", {ttl: -1, path: path, domain: domain})
				}
			}
		})
		exports.log.warn("Cookie fixation detected: %s", req.headers.cookie)
	} else try {
		return decodeURIComponent((junks[1] || "").split(";")[0])
	} catch(e) {
		exports.log.warn("Invalid cookie '%s' in: %s", name, req.headers.cookie)
	}
	return ""
}

function setCookie(name, value, opts) {
	var res = this
	, existing = res.getHeader("set-cookie")
	, cookie = (
		typeof name === "object" ? (opts = name).name : name
	) + "=" + escapeCookie(value)

	if (opts) {
		cookie +=
		// Max-Age=1 - Number of seconds until the cookie expires.
		// ie8 do not support max-age.
		// if both (Expires and Max-Age) are set, Max-Age will have precedence.
		(opts.ttl      ? "; Expires=" + new Date(opts.ttl > 0 ? Date.now() + (opts.ttl*1000) : 0).toUTCString() : "") +
		(opts.path     ? "; Path=" + opts.path : "") +
		(opts.domain   ? "; Domain=" + opts.domain : "") +
		(opts.secure   ? "; Secure" : "") +
		(opts.httpOnly ? "; HttpOnly" : "") +
		(opts.sameSite ? "; SameSite=" + opts.sameSite : "")
	}

	if (Array.isArray(existing)) {
		existing.push(cookie)
	} else {
		res.setHeader("Set-Cookie", existing ? [existing, cookie] : cookie)
	}
	exports.log.debug("Set-Cookie: %s", cookie)
}

function escapeCookie(value) {
	return ("" + value).replace(valueEsc, encodeURIComponent)
}

