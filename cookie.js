
exports.get = getCookie
exports.set = setCookie

function getCookie(name, opts) {
	opts = opts || {}

	var req = this
	, junks = ("; " + req.headers.cookie).split("; " + name + "=")

	if (junks.length > 2) {
		;(opts.path || "").split("/").map(function(val, key, arr) {
			var path = arr.slice(0, key+1).join("/")
			, domain = opts.domain
			req.res.cookie(name, "", {ttl: -1, path: path})
			if (domain) {
				req.res.cookie(name, "", {ttl: -1, path: path, domain: domain})

				if (domain !== (domain = domain.replace(/^[^.]+/, "*"))) {
					req.res.cookie(name, "", {ttl: -1, path: path, domain: domain})
				}
			}
		})
		throw "Error: Cookie fixation detected: " + req.headers.cookie
	}

	return decodeURIComponent((junks[1] || "").split(";")[0])
}

function setCookie(name, value, opts) {
	var res = this
	, existing = (res._headers || {})["set-cookie"] || []

	if (!Array.isArray(existing)) {
		existing = [ existing ]
	}

	value = encodeURIComponent(value || "")

	if (opts) {
		value +=
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

	existing.push(name + "=" + value)

	res.setHeader("Set-Cookie", existing)
}

