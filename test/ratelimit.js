
var it = describe.it


// Leaky bucket
//
// 14.37 Retry-After
//
// Retry-After  = "Retry-After" ":" ( HTTP-date | delta-seconds )
//
//        Retry-After: Fri, 31 Dec 1999 23:59:59 GMT
//        Retry-After: 120


describe("ratelimit", function() {
	this.conf.trace = 9

	this
	.should("provide defaults", function(assert, mock) {
		var req = {
			ip: "0"
		}
		var ipLimit = require("../ratelimit")()

		assert.plan(1)

		run(null, 0, [])

		assert.ok(1)

		function run(expect, delay, headers) {
			assert.planned++
			var now = Date.now()
			, res= {
				statusCode: 200,
				setHeader: mock.fn(),
				end: mock.fn(expect && function(body) {
					headers.forEach(function(header, i) {
						assert.planned++
						assert.equal(res.setHeader.calls[i].args, header)
					})
					assert.equal(body, "Too Many Requests")
				})
			}
			ipLimit(req, res, function(err) {
				var diff = Date.now() - now
				assert.planned += 2
				assert.equal(err, undefined)
				assert.equal(res.statusCode, 200)
				headers.forEach(function(header, i) {
					assert.planned++
					assert.equal(res.setHeader.calls[i].args, header)
				})
				assert.ok(Date.now() - now >= delay)
			})
		}
	})
	it ("should limit requests", function(assert, mock) {
		var req = {
			ip: "0"
		}
		var ipLimit = require("../ratelimit")({
			field: "ip",
			// limit to 10 requests in 1 min
			limit: 10,
			penalty: 60,
			time: 50,
			steps: 2
		})

		assert.plan(1)

		run(null, 0, [])
		run(null, 0, [])
		run(null, 0, [])
		run(null, 0, [])
		run(null, 0, [])

		req.ip = "b"
		run(null, 0, [])
		req.ip = "c"
		run(null, 0, [])
		run(null, 0, [])
		run(null, 0, [])
		run(null, 0, [])
		run(null, 0, [])
		run(null, 0, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 4]])

		for (var i = 501; i > 0; ) {
			req.ip = "a" + i--
			run(null, 0, [])
		}
		req.ip = "0"

		run(null,  0, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 4]])
		run(null, 12, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 3]])
		run(null, 24, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 2]])
		run(null, 36, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 1]])
		run(null, 48, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 0]])
		run(true, 60, [[ "Rate-Limit", 10 ], [ "Retry-After", 25 ]])

		setTimeout(function() {
			for (var i = 1001; i > 0; ) {
				req.ip = "a" + i--
				run(null, 0, [])
			}
			req.ip = "0"
			run(null, 12, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 3]])
			run(null, 24, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 2]])
		}, 26)

		setTimeout(function() {
			req.ip = "d"
			run(null, 0, [])
			run(null, 0, [])
			run(null, 0, [])
			run(null, 0, [])
			run(null, 0, [])
			run(null, 0, [[ "Rate-Limit", 10 ], [ "Rate-Limit-Remaining", 4]])
			req.ip = "0"
			run(null, 0, [])
			run(null, 0, [])
		}, 51)

		setTimeout(function() {
			assert.ok(1)
		}, 101)

		function run(expect, delay, headers) {
			assert.planned++
			var now = process.hrtime()
			, res= {
				statusCode: 200,
				setHeader: mock.fn(),
				end: mock.fn(expect && function(body) {
					headers.forEach(function(header, i) {
						assert.planned++
						assert.equal(res.setHeader.calls[i].args, header)
					})
					assert.equal(body, "Too Many Requests")
				})
			}
			ipLimit(req, res, function(err) {
				var diff = process.hrtime(now)
				diff = diff[0]*1e3 + diff[1]/1e6 + 1
				assert.planned += 2
				assert.equal(err, undefined)
				assert.equal(res.statusCode, 200)
				headers.forEach(function(header, i) {
					assert.planned++
					assert.equal(res.setHeader.calls[i].args, header)
				})
				assert.ok(diff >= delay, "Delay " + delay + " >= " + diff)
			})
		}
	})
})


