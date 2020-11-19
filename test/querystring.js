
var describe = require("litejs/test").describe
, it = describe.it




describe("querystring", function() {
	var qs = require("../querystring")

	it ("parse querystring", function(assert) {
		var j, test
		, tests = [
			[
				{}, "", null
			], [
				{"foo": "bar"},
				"foo=bar"
			], [
				{"foo": ["bar"]},
				"foo[]=bar",
				"foo[0]=bar",
				"foo[1]=bar"
			], [
				{"foo": ["bar", "quux"]},
				"foo=bar&foo=quux",
				"foo[]=bar&foo[]=quux",
				"foo[0]=bar&foo[1]=quux",
				"foo[1]=bar&foo[2]=quux"
			], [
				{"map": {"a":"1","b":["2","3"]}},
				"map[a]=1&map[b]=2&map[b]=3",
				"map[a]=1&map[b][]=2&map[b][]=3",
				"map[a]=1&map[b][0]=2&map[b][1]=3"
			], [
				{"my weird field": "q1!2\"'w$5&7/z8)?"},
				'my+weird+field=q1%212%22%27w%245%267%2Fz8%29%3F',
				'my%20weird%20field=q1!2%22\'w%245%267%2Fz8)%3F'
			], [
				{"a": ["1", "2", "", ""]},
				"a=1&a=2&a&a="
			]
		]
		, i = 0

		for (; test = tests[i++]; ) {
			for (j = 1; j < test.length; ) {
				assert.equal(qs.parse(test[j++]), test[0])
			}
		}

		assert.end()
	})
})



