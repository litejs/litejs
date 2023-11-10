
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
			}, "", "foo=1; foo=2"],
			[{
				name:"foo",
				domain:"example.com",
			}, "", "foo=1; foo=2"],
			[{
				name:"foo",
			}, "", "foo=1; foo=2"],
		]
		, i = 0

		for (; test = tests[i++]; ) {
			req = new Req()
			for (j = test.length; --j > 1; ) {
				req.headers.cookie = test[j]
				assert.equal(req.cookie(test[0]), test[1])
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
			["a=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; b=2", {name:"a", maxAge: -1}, "", "b", 2],
			[
				"a=1; Path=/; Domain=example.com; b=2; Expires=Tue, 17 Nov 2020 10:42:06 GMT; foo=bar; Secure; HttpOnly; SameSite=Lax",
				{ name:"a", domain: "example.com", path: "/" }, "1",
				{ name: "b", maxAge: "1 min" }, 2,
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

	it ("should override cookies", function(assert, mock) {
		var res = new Res()
		res.cookie("a", "1")
		assert.equal(res.headers["set-cookie"], "a=1")
		res.cookie("a", "2")
		assert.equal(res.headers["set-cookie"], "a=2")
		res.cookie("foo", "bar")
		assert.equal(res.headers["set-cookie"], [ "a=2", "foo=bar" ])
		res.cookie("a", "3")
		assert.equal(res.headers["set-cookie"], [ "foo=bar", "a=3" ])
		assert.end()
	})

	it ("should detect cookie fixation", function(assert, mock) {
		var req = new Req()
		req.headers.cookie = "foo=; foo=a"
		assert.equal(req.cookie("foo"), "")
		assert.equal(req.res.headers["clear-site-data"], '"cookies"')
		assert.end()
	})

	it ("should reject non-matching cookies", function(assert, mock) {
		var req = new Req()
		req.headers.cookie = "foo=aa; bar=123"
		assert.equal(req.cookie("foo"), "aa")
		assert.equal(req.cookie({name:"foo"}), "aa")
		assert.equal(req.cookie({name:"foo", re: /^\d+$/ }), "")
		assert.equal(req.cookie({name:"bar", re: /^\d+$/ }), "123")
		assert.end()
	})

	function Req(opts) {
		var req = this
		req.res = new Res(req)
		req.opts = {
			log: { warn: function() {} }
		}
		req.cookie = server.getCookie
		req.headers = Object.assign({}, opts && opts.headers)
	}
	function Res(req, opts) {
		var res = this
		res.req = req || new Req()
		res.opts = {
			log: { warn: function() {} }
		}
		res.cookie = server.setCookie
		res.headers = Object.assign({}, opts && opts.headers)
	}
	Req.prototype = Res.prototype = {
		getHeader: function(name) {
			return this.headers[name.toLowerCase()] || null
		},
		setHeader: function(name, value) {
			this.headers[name.toLowerCase()] = value
		}
	}
})



