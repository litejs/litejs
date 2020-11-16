

var path = require("path")
, path2 = require("../path")

require("litejs/test").describe.it ("normalizes path", function(assert) {
	assert.pathNormalize = function(actual, expected) {
		var res1 = path2.normalize(actual)
		var res2 = path.normalize(actual)
		var msg = actual + " -> " + expected + ""
		this.equal(res1, expected, "norm: " + msg + " != "+ res1 + " ["+res2+"]")
		this.equal(res2, expected, "path: " + msg + " != "+ res2 + " ["+res1+"]")
		return this
	}
	assert.pathResolve = function(actual, expected) {
		var res1 = path2.resolve.apply(path2, actual)
		var res2 = path.resolve.apply(path, actual)
		var msg = actual + " -> " + expected + ""
		this.equal(res1, expected, "norm: " + msg + " != "+ res1 + " ["+res2+"]")
		this.equal(res2, expected, "path: " + msg + " != "+ res2 + " ["+res1+"]")
		return this
	}
	assert.pathRelative = function(from, to, expected) {
		var res1 = path2.relative(from, to)
		var res2 = path.relative(from, to)
		var msg = from + " -> " + to + " = " + expected
		this.equal(res1, expected, "norm: " + msg + " != ["+ res1 + "] ["+res2+"]")
		this.equal(res2, expected, "path: " + msg + " != ["+ res2 + "] ["+res1+"]")
		return this
	}

	assert
	.pathNormalize("/ab/cd", "/ab/cd")
	.pathNormalize("/ab/cd/", "/ab/cd/")

	.pathNormalize("/ab/cd.e", "/ab/cd.e")
	.pathNormalize("/ab/cd.ef", "/ab/cd.ef")
	.pathNormalize("/ab/cd/.e", "/ab/cd/.e")
	.pathNormalize("/ab/cd/.ef", "/ab/cd/.ef")
	.pathNormalize("/..ab../cd../..ef/.gh/ij.", "/..ab../cd../..ef/.gh/ij.")

	// it replaces multiple slashes with a single one

	.pathNormalize("//ab/cd/", "/ab/cd/")
	.pathNormalize("/ab//cd/", "/ab/cd/")
	.pathNormalize("/ab/cd//", "/ab/cd/")

	.pathNormalize("///ab/cd/", "/ab/cd/")
	.pathNormalize("/ab///cd/", "/ab/cd/")
	.pathNormalize("/ab/cd///", "/ab/cd/")

	.pathNormalize("/ab/cd..", "/ab/cd..")
	.pathNormalize("/ab/cd/..", "/ab")
	.pathNormalize("/ab/cd.", "/ab/cd.")
	.pathNormalize("/ab/cd/.", "/ab/cd")

	.pathNormalize("./ab/cd", "ab/cd")
	.pathNormalize("../ab/cd", "../ab/cd")
	.pathNormalize("../../ab/cd", "../../ab/cd")

	.pathNormalize("/ab/./cd", "/ab/cd")
	.pathNormalize("/ab//./cd", "/ab/cd")
	.pathNormalize("/ab///./cd", "/ab/cd")
	.pathNormalize("/ab/.///cd", "/ab/cd")
	.pathNormalize("/ab/.//cd", "/ab/cd")

	.pathNormalize("/../ab", "/ab")
	.pathNormalize("/..ab", "/..ab")
	.pathNormalize("/ab/../cd", "/cd")
	.pathNormalize("/ab/../cd..", "/cd..")
	.pathNormalize("/ab//../cd", "/cd")
	.pathNormalize("/ab///../cd", "/cd")
	.pathNormalize("/ab/..///cd", "/cd")
	.pathNormalize("/ab/..//cd", "/cd")

	// it should pass nodejs path.normalize() tests

	.pathNormalize('./fixtures///b/../b/c.js', 'fixtures/b/c.js')
	.pathNormalize('/foo/../../../bar', '/bar')
	.pathNormalize('a//b//../b', 'a/b')
	.pathNormalize('a//b//./c', 'a/b/c')
	.pathNormalize('a//b//.', 'a/b')

	// it should pass nodejs path.relative() tests

	.pathRelative('/var',     '/var/.', '')
	.pathRelative('/var/lib', '/var', '..')
	.pathRelative('/var/lib', '/bin', '../../bin')
	.pathRelative('/var/lib', '/var/lib', '')
	.pathRelative('/var/lib', '/var/apache', '../apache')
	.pathRelative('/var/',    '/var/lib', 'lib')
	.pathRelative('/var',     '/var/lib', 'lib')
	.pathRelative('/',        '/var/lib', 'var/lib')
	.pathRelative('/',        '/var/lib/', 'var/lib')
	.pathRelative('/foo/test','/foo/test/bar/package.json', 'bar/package.json')
	.throws(function() {
		path2.relative("/var/lib", {})
	})

	// it should pass nodejs path.resolve() tests

	.pathResolve(['/var/lib', '../', 'file/'], '/var/file')
	.pathResolve(['/var/lib', '/../', 'file/'], '/file')
	.pathResolve(['a/b/c/', '../../..'], process.cwd())
	.pathResolve(['.'], process.cwd())
	.pathResolve(['/some/dir', '.', '/absolute/'], '/absolute')
	.pathResolve(['/foo/tmp.3/', '../tmp.3/cycles/root.js'], '/foo/tmp.3/cycles/root.js')
	.throws(function() {
		path2.resolve("/a", {}, "b/c")
	})

	.pathResolve(['/foo/bar', './baz'], '/foo/bar/baz')
	.pathResolve(['/foo/bar', '/tmp/file/'], '/tmp/file')
	.pathResolve(['/foo', '/bar', 'baz'], '/bar/baz')

	.end()
})

.it ("should pass nodejs tests", function(assert) {
	function dirname(input, expected) {
		var actual = path.dirname(input)
		assert.equal(actual, expected, "node: " + input + " => " + actual + " != "+ expected)
		actual = path2.dirname(input)
		assert.equal(actual, expected, "lite: " + input + " => " + actual + " != "+ expected)
	}
	dirname('/a/b/', '/a')
	dirname('/a/b',  '/a')
	dirname('/a',    '/')
	dirname('/abc/bde/', '/abc')
	dirname('/abc/bde',  '/abc')
	dirname('/abc',    '/')
	dirname('/',     '/')
	dirname('////',  '/')
	dirname('',      '.')
	dirname('foo',   '.')

	assert.end()
})




