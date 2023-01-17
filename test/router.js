

describe("router", function() {

	var createRouter = require("../router.js")
	, Router = createRouter.Router


	it("should route", function(assert) {
		var r = Router()
		;["home", "user/{userId}", "settings", "about", "about/co"].map(r.add)

		function matches(url, idx, params) {
			var p = {}
			assert
			.equal(r.route(url, p, -1), idx)
			.equal(p, params)
		}

		matches("home", 0, {})
		matches("hom", -1, {})
		matches("user/123", 1, { userId: "123" })

		assert.end()
	})

	it("should create routes", function(assert, mock) {
		var router = createRouter()
		, ab = mock.fn()
		, c = mock.fn()
		, next = mock.fn()

		router.get("ab", ab)
		router.post("c", c)

		router({method: "GET", url: "/ab"}, {}, next)
		assert.equal(ab.called, 1)

		router({method: "POST", url: "/ab"}, {}, next)
		assert.equal(next.called, 1)
		assert.end()
	})
})


