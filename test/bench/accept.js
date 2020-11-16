
var accept = require("../../accept").accept
, nego = accept("image/svg+xml; charset=utf-8")
, Negotiator = require("negotiator")
, availableMediaTypes = ["text/html", "text/xhtml+xml", "application/json"]
, req = {
	headers: {
		accept: "application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5"
	}
}

// npm install content-type
//
module.exports = {
	"LiteJS accept": function() {
		nego(req.headers.accept)
	},
	"negotiator": function() {
		var negod = new Negotiator(req)
		negod.mediaTypes(availableMediaTypes)
	}
}

