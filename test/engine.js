

require("litejs/test")
.describe("engine", function() {
	this
	.should("parse full date", function(assert, mock) {
		mock.time(0, 0)

		// HTTP have historically allowed three different formats for date
		assert
		.equal(Date.parse("Sun, 06 Nov 1994 08:49:37 GMT"), 784111777000)   // RFC 822, updated by RFC 1123, preferred
		.equal(Date.parse("Sunday, 06-Nov-94 08:49:37 GMT"), 784111777000)  // RFC 850, obsoleted by RFC 1036
		.equal(Date.parse("Sun Nov  6 08:49:37 1994"), 784111777000)        // ANSI C's asctime() format
		.equal(new Date(784111777000).toUTCString(), "Sun, 06 Nov 1994 08:49:37 GMT")
		.end()
	})
})



