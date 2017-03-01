
var debug = require("../lib/debug.js")
, log = debug("app:ratelimit")
, logBlock = debug("app:ratelimit:block")
, logLeak = debug("app:ratelimit:leak")

// Leaky bucket
//
// 14.37 Retry-After
//
// The Retry-After response-header field can be used with a 503 (Service Unavailable) response
// to indicate how long the service is expected to be unavailable to the requesting client.
// This field MAY also be used with any 3xx (Redirection) response
// to indicate the minimum time the user-agent is asked wait before issuing the redirected request.
// The value of this field can be either an HTTP-date
// or an integer number of seconds (in decimal) after the time of the response.
//
// Retry-After  = "Retry-After" ":" ( HTTP-date | delta-seconds )
//
//        Retry-After: Fri, 31 Dec 1999 23:59:59 GMT
//        Retry-After: 120


module.exports = createRatelimit

function createRatelimit(options) {
	options = options || {}

	var counters = options.counters || {}
	, limit = options.limit || 1000
	, time = options.time || 60*60
	, steps = options.steps || 60
	, tickTime = (time/steps)|0
	, leak = Math.ceil(limit/steps)
	, field = options.field || "ip"

	log("created", options)
	setInterval(tick, tickTime * 1000)

	return ratelimit

	function ratelimit(req, res, next) {
		var key = req[field]
		, remaining = limit - (counters[key] || (counters[key] = 0)) - 1

		counters[key]++

		if (remaining < leak) {
			res.setHeader("Rate-Limit", limit)

			if (remaining < 0) {
				res.statusCode = 429
				res.setHeader("Retry-After", tickTime * Math.ceil(-remaining/leak))
				logBlock(field, key)
				return res.end("Too Many Requests")
			}
			res.setHeader("Rate-Limit-Remaining", remaining)
			setTimeout(next, 5000)
		} else {
			next()
		}
	}

	function tick() {
		var key
		, count = 0
		, clean = 0
		for (key in counters) {
			if (counters[key] > leak) {
				count++
				counters[key] -= leak
			} else {
				clean++
				delete counters[key]
			}
		}
		logLeak("leak", leak, "clean", clean, "size", count)
	}
}



