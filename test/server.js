
describe("server", function() {
	var createServer = require("../server.js")
	, util = require("../util.js")

	it ("handles middlewares", function(assert) {
		assert.plan(1)
		var server = createServer({
			maxURILength: 25,
			status: {
				418: "I'm a Teapot"
			}
		})
		, client = makeClient(assert, server)

		server.use(function(req, res, next) {
			res.useAll = 1
			next()
		})
		server.get(function(req, res, next) {
			res.getAll = 2
			next()
		})
		server.get("/a", function(req, res, next) {
			res.send({a: 1})
		})
		server.use("/b", function(req, res, next) {
			res.send({b: 2})
		})
		server.put("/c", function(req, res, next) {
			res.sendStatus(204)
		})
		server.use("/err/throw", function(req, res, next) {
			throw "I'm a Teapot"
		})
		server.get("/err/nextMessage", function(req, res, next) {
			next("I'm a Teapot")
		})
		server.get("/err/nextStatus", function(req, res, next) {
			next(418)
		})

		client("PUT", "/a", {}, { useAll: 1, statusCode: 404 })
		client("GET", "/a", { headers: { accept: "text/strange" }, socket: { remoteAddress: "1.2.3.4"} }, { useAll: 1, getAll: 2, statusCode: 406, req: { ip: "1.2.3.4" }})
		client("GET", "/a", { headers: { accept: "application/json", "x-forwarded-for": "123.2.3.4, 127.0.0.2" } }, { statusCode: 200, _body: '{"a":1}', req: { ip: "123.2.3.4" } })
		client("POST", "/b", { headers: { accept: "text/csv" } }, { statusCode: 200, _body: '2' })
		client("GET", "/err/404", {}, { statusCode: 404 })
		client("GET", "/err/throw", {}, { statusCode: 418, statusMessage: "I'm a Teapot", headers: { } })
		client("HEAD", "/err/throw", {}, { statusCode: 418, statusMessage: "I'm a Teapot", _body: null, headers: { } })
		client("GET", "/err/nextMessage", {}, { statusCode: 418, statusMessage: "I'm a Teapot" })
		client("GET", "/err/nextStatus", {}, { statusCode: 418, statusMessage: "I'm a Teapot" })
		client("GET", "/err/longer-than-maxURILength-url", {}, { statusCode: 414 })
		client("PUT", "/c", {}, { statusCode: 204, headers: { } })

		assert.type(server, "function")
	})

	it ("set headers", function(assert) {
		assert.plan(1)
		var server = createServer({
			headers: {
				"/index.html": {
					"X-Content-Type-Options": "nosniff"
				},
				"*": {
					"X-Custom": "bla"
				}
			}
		})
		, client = makeClient(assert, server)

		server.get("/index.html", function(req, res, next) {
			res.send("OK")
		})

		server.get("/link", function(req, res, next) {
			res.link("preconnect", "https://example.com")
			res.send("Linked")
		})

		client("GET", "/index.html", {}, { statusCode: 200, _body: "OK", headers: { "X-Content-Type-Options": "nosniff", "X-Custom": "bla" } })
		client("HEAD", "/index.html", {}, { statusCode: 200, _body: null, headers: { "X-Content-Type-Options": "nosniff", "X-Custom": "bla" } })
		client("GET", "/index.jpg", {}, { statusCode: 404, headers: { "X-Custom": "bla" } })
		client("GET", "/link", {}, { statusCode: 200, _body: "Linked", headers: { "Link": '<https://example.com>; rel="preconnect"' } })

		assert.type(server, "function")
	})

	function makeClient(assert, server, clientDefaults) {
		return makeReq


		function makeReq(method, url, req, expected) {
			assert.planned += 1
			server.opts.log = { error: function() {} }
			var res = {
				_body: null,
				statusCode: null,
				headers: {},
				getHeader: function(name) {
					for (var key in res.headers) {
						if (key.toLowerCase() === name.toLowerCase()) return res.headers[key]
					}
					return null
				},
				setHeader: function(name, value) {
					res.headers[name] = "" + value
				},
				write: function(message) {
					res._body = res._body ? res._body + message : message
				},
				writeHead: function(statusCode, headers) {
					res.statusCode = statusCode
					Object.assign(res.headers, headers)
				},
				end: function(message) {
					if (message) res.write(message)
					assert.own(res, expected)
				}
			}
			server(util.deepAssign({
				method, url,
				headers: {
					"accept": "*/*"
				}
			}, req), res)
		}

	}
})

