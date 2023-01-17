

describe("router", function() {

	var router = require("../router").router


	it("should route", function(assert) {
		var r = router()
		;["home", "user/{userId}", "settings", "about", "about/co"].map(r.add)

		function matches(url, route, params) {
			var p = {}

			assert
			.equal(r.route(url, p), route)
			.equal(p, params)
		}

		matches("home", "home", {})
		matches("hom", "home", {})
		matches("user/123", "user/{userId}", { userId: "123" })


		assert.end()
	})
})


