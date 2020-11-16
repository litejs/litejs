
var path = require("path")
, path2 = require("../../path")

module.exports = {
	"Node.js path.normalize": function a() {
		path.normalize("/ab/cd/")
		path.normalize("../../ab/cd")
		path.normalize('./fixtures///b/../b/c.js')
		path.normalize('/foo/../../../bar')
		path.normalize('a//b//../b')
		path.normalize('a//b//./c')
		path.normalize('a//b//.')
		path.normalize("a/../b.c")
		path.normalize("a/a/..//../b.c")
		path.normalize("a/./b.c")
		path.normalize("a//b//.")
		path.normalize("/..ab../cd../..ef/.gh/ij.")
		path.normalize("/ab/cd///")
	},
	"LiteJS path.normalize": function b() {
		path2.normalize("/ab/cd/")
		path2.normalize("../../ab/cd")
		path2.normalize('./fixtures///b/../b/c.js')
		path2.normalize('/foo/../../../bar')
		path2.normalize('a//b//../b')
		path2.normalize('a//b//./c')
		path2.normalize('a//b//.')
		path2.normalize("a/../b.c")
		path2.normalize("a/a/..//../b.c")
		path2.normalize("a/./b.c")
		path2.normalize("a//b//.")
		path2.normalize("/..ab../cd../..ef/.gh/ij.")
		path2.normalize("/ab/cd///")
	}
}

