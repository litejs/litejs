
var path = require("path")
, path2 = require("../../path")

module.exports = {
	"Node.js path.relative": function a() {
		path.relative('/abc/cde', '/abc/efg')
	},
	"LiteJS path.relative": function b() {
		path2.relative('/abc/cde', '/abc/efg')
	}
}

