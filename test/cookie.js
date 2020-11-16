
var describe = require("litejs/test").describe
, it = describe.it


describe("cookie", function() {
	var cookie = require("../cookie")

	it ("should get cookies", function(assert) {
		var j, test
		, tests = [
			// name, value, rest
			["a", "1", "a=1", "a=1; ", "b=2; a=1"],
			[{name:"a"}, "1", "a=1"]
		]
		, i = 0
		, len = tests.length

		for (; test = tests[i++]; ) for (j = test.length; --j > 1; ) {
			assert.equal(cookie.get.call({
				headers: {
					cookie: test[j]
				}
			}, test[0]), test[1])
		}

		assert.end()
	})

	it ("_should set cookies", function(assert, mock) {
		var j, test
		, tests = [
			// name, value, rest
			["a", "1", "a=1", "a=1; ", "b=2; a=1"],
			[{name:"a"}, "1", "a=1"]
		]
		, i = 0
		, len = tests.length

		for (; test = tests[i++]; ) for (j = test.length; --j > 1; ) {
			assert.equal(cookie.get.call({
				headers: {
					cookie: test[j]
				}
			}, test[0]), test[1])
		}

		assert.end()
	})
})



