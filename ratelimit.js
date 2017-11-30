
var debug = require("../lib/debug.js")
, log = debug("app:ratelimit")
, logBlock = debug("app:ratelimit:block")
, logLeak = debug("app:ratelimit:leak")

// Leaky bucket
//
// 14.37 Retry-After
//
// Retry-After  = "Retry-After" ":" ( HTTP-date | delta-seconds )
//
//        Retry-After: Fri, 31 Dec 1999 23:59:59 GMT
//        Retry-After: 120


module.exports = createRatelimit

function createRatelimit(opts) {
	opts = opts || {}

	var counters = {}
	, nulls = 0
	, limit = opts.limit || 1000
	, time = opts.time || 60*60*1000
	, steps = opts.steps || 60
	, field = opts.field || "ip"
	, penalty = opts.penalty || 5000
	, tickTime = (time/steps)|0
	, leak = Math.ceil(limit/steps)

	log("created", opts)
	setInterval(tick, tickTime)

	return ratelimit

	function ratelimit(req, res, next) {
		var key = req[field]
		, remaining = limit - (counters[key] || (counters[key] = 0)) - 1

		counters[key]++

		if (remaining < leak) {
			res.setHeader("Rate-Limit", limit)

			if (remaining < 0) {
				logBlock(field, key)
				setTimeout(block, penalty, res, remaining)
			} else {
				res.setHeader("Rate-Limit-Remaining", remaining)
				setTimeout(next, Math.ceil((leak - remaining) / leak * penalty))
			}
		} else {
			next()
		}
	}

	function block(res, remaining) {
		res.statusCode = 429
		res.setHeader("Retry-After", tickTime * Math.ceil(-remaining/leak))
		res.end("Too Many Requests")
	}

	function tick() {
		var key, counter, next
		, count = 0
		, clean = 0

		if (nulls > 1000) {
			next = {}
			for (key in counters) if (counters[key] > leak) {
				count++
				next[key] = counters[key] - leak
			} else clean++
			nulls = 0
			counters = next
		} else {
			for (key in counters) if (null !== (counter = counters[key])) {
				if (counter > leak) {
					count++
					counters[key] -= leak
				} else {
					clean++
					counters[key] = null
				}
			}
			nulls += clean
		}
		logLeak("leak:" + leak, "clean:" + clean, "size:" + count)
	}
}



