
var path = require("path")
, path2 = require("../../path")

module.exports = {
	"Node.js path.dirname": function a() {
		path.dirname('/a/b/')
		path.dirname('/a/b')
		path.dirname('/a')
		path.dirname('/abc/bde/')
		path.dirname('/abc/bde')
		path.dirname('/abc')
	},
	"LiteJS path.dirname": function b() {
		path2.dirname('/a/b/')
		path2.dirname('/a/b')
		path2.dirname('/a')
		path2.dirname('/abc/bde/')
		path2.dirname('/abc/bde')
		path2.dirname('/abc')
	}
}

