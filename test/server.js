
describe("server", function() {
	var createServer = require("../server.js")
	, util = require("../util.js")

	it ("handles middlewares", function(assert) {
		assert.plan(1)
		var server = createServer({
			maxURILength: 15
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

		makeReq(assert, server, "PUT", "/a", {}, { statusCode: 404 })
		makeReq(assert, server, "GET", "/a", {headers: { accept: "text/strange" }}, { statusCode: 406 })

		makeReq(assert, server, "GET", "/a", { headers: { accept: "application/json" } }, { statusCode: 200, _body: '{"a":1}' })

		makeReq(assert, server, "POST", "/b", { headers: { accept: "text/csv" } }, { statusCode: 200, _body: '2' })

		makeReq(assert, server, "GET", "/err/404", {}, { statusCode: 404 })
		makeReq(assert, server, "GET", "/err/longer-than-maxURILength-url", {}, { statusCode: 414 })
		makeReq(assert, server, "PUT", "/c", {}, { statusCode: 204, headers: { } })

		assert.type(server, "function")
	})

	function makeReq(assert, server, method, url, req, expected) {
		assert.planned += 1
		server.opts.log = { error: function() {} }
		var res = {
			_body: "",
			statusCode: 200,
			headers: {},
			setHeader: function(name, value) {
				res.headers[name] = "" + value
			},
			write: function(message) {
				res._body += message
			},
			writeHead: function(statusCode, headers) {
				res.statusCode = statusCode
				Object.assign(res.headers, headers)
			},
			end: function(message) {
				if (message) res._body += message
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
})

