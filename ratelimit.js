
module.exports = createRatelimit

function createRatelimit(opts) {
	opts = opts || {}

	var counters = {}
	, limit = opts.limit || 1000
	, steps = opts.steps || 60
	, field = opts.field || "ip"
	, penalty = opts.penalty || 5000
	, tickTime = ((opts.time || 60*60*1000)/steps)|0
	, leak = Math.ceil(limit/steps)
	, penaltyLeak = Math.ceil(penalty/leak)
	, nulled = 0
	, warn = limit - leak

	setInterval(tick, tickTime).unref()

	return function ratelimit(req, res, next) {
		var remaining
		, key = req[field]

		if (warn < (counters[key] > 0 ? ++counters[key] : (counters[key] = 1))) {
			res.setHeader("Rate-Limit", limit)

			remaining = limit - counters[key]
			if (remaining < 0) {
				res.setHeader("Retry-After", tickTime * Math.ceil(-remaining/leak))
				setTimeout(block, penalty, res)
			} else {
				res.setHeader("Rate-Limit-Remaining", remaining)
				setTimeout(next, penalty - penaltyLeak - remaining * penaltyLeak)
			}
		} else {
			next()
		}
	}

	function block(res) {
		res.statusCode = 429
		res.end("Too Many Requests")
	}

	function tick() {
		var key, next
		, curr = counters

		if (nulled > 1000) {
			nulled = 0
			counters = next = {}
			for (key in curr) if (curr[key] > leak) {
				next[key] = curr[key] - leak
			}
		} else {
			for (key in curr) if (curr[key] > 0) {
				if ((curr[key] -= leak) <= 0) nulled++
			}
		}
	}
}



