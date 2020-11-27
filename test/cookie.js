
var it = describe.it


describe("cookie", function() {
	var server = require("../server")

	// Max-Age=1 - Number of seconds until the cookie expires.
	// ie8 do not support max-age.
	// if both (Expires and Max-Age) are set, Max-Age will have precedence.

	it ("should get cookies", function(assert) {
		var req, j, test
		, tests = [
			// name, value, rest
			["a", "1", "a=1", "a=1; ", "b=2; a=1"],
			[{name:"a"}, "", "a=", "b=1", "a=%E0%A4%A"],
			[{
				name:"foo",
				domain:"www.example.com",
				_setCookie: "foo=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; foo=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Domain=www.example.com; foo=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Domain=*.example.com"
			}, "", "foo=1; foo=2"],
			[{
				name:"foo",
				domain:"example.com",
				_setCookie: "foo=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; foo=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Domain=example.com"
			}, "", "foo=1; foo=2"],
			[{
				name:"foo",
				_setCookie: "foo=; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
			}, "", "foo=1; foo=2"],
		]
		, i = 0

		for (; test = tests[i++]; ) {
			req = new Req()
			req.res = new Req()
			req.res.cookie = server.setCookie
			for (j = test.length; --j > 1; ) {
				req.headers.cookie = test[j]
				assert.equal(req.cookie(test[0]), test[1])
				if (test[0]._setCookie) {
					assert.equal([].concat(req.res.getHeader("set-cookie")).join("; "), test[0]._setCookie)
				}
			}
		}

		assert.end()
	})

	it ("should set cookies", function(assert, mock) {
		mock.time("2020-11-17T10:41:06.320Z")
		var req, j, test
		, tests = [
			["a=1", "a", "1"],
			["a=1; b=2", {name:"a"}, "1", "b", 2],
			[
				"a=1; Path=/; Domain=example.com; b=2; Expires=Tue, 17 Nov 2020 10:42:06 GMT; foo=bar; Secure; HttpOnly; SameSite=Lax",
				{ name:"a", domain: "example.com", path: "/" }, "1",
				{ name: "b", maxAge: 60 }, 2,
				{ name: "foo", secure: true, httpOnly: 1, sameSite: "Lax" }, "bar"
			]
		]
		, i = 0

		for (; test = tests[i++]; ) {
			req = new Req()
			req.cookie = server.setCookie
			for (j = 1; j < test.length; ) {
				req.cookie(test[j++], test[j++])
			}
			assert.equal([].concat(req.getHeader("set-cookie")).join("; "), test[0])
		}

		assert.end()
	})

	function Req(opts) {
		var req = this
		req.opts = {
			log: { warn: function() {} }
		}
		req.cookie = server.getCookie
		req.headers = Object.assign({}, opts && opts.headers)
	}
	Req.prototype = {
		getHeader: function(name) {
			return this.headers[name.toLowerCase()] || null
		},
		setHeader: function(name, value) {
			this.headers[name.toLowerCase()] = value
		}
	}
})



