
var describe = require("litejs/test").describe
, it = describe.it

// Subtypes:
//  - alternative
//  - byterange     https://tools.ietf.org/html/rfc7233#section-5.4.1
//  - digest
//  - encrypted
//  - form-data     https://tools.ietf.org/html/rfc7578
//  - mixed
//  - related       https://tools.ietf.org/html/rfc2387
//  - report
//  - signed
//  - x-mixed-replace

describe("content", function() {
	var zlib
	, fs = require("fs")
	, stream = require("stream")
	, content = require("../content")

	try {
		zlib = require("zlib")
	} catch(e) {}

	describe.assert.fakeReq = fakeReq


	it("should parse application/json", function(assert) {
		assert.plan(3)

		assert.fakeReq({
			headers: {
				"accept": "application/json",
				"content-encoding": "identity"
			},
			body: '{"a":1}'
		}, {a:1})

		assert.fakeReq({
			headers: {
				"content-type": "application/json"
			},
			body: ''
		}, {})

		assert.fakeReq({
			headers: {
				"content-type": "application/json",
				"content-encoding": zlib ? "deflate, identity, br" : ""
			},
			body: zlib ? zlib.brotliCompressSync(zlib.deflateSync('{"a":2}')) : '{"a":2}'
		}, {a:2})

	})

	it("should parse application/x-www-form-urlencoded", function(assert) {
		assert.plan(1)
		assert.fakeReq({
			headers: {
				"content-type": "application/x-www-form-urlencoded"
			},
			body: 'a=1&b=2'
		}, {a:"1", b:"2"})
	})

	it("should parse multipart/form-data with files", function(assert) {
		var boundary = "--" + Math.random().toString(35).slice(2) + Math.random().toString(35).slice(2) + "z"
		, body = [
			"--" + boundary,
			'Content-Disposition: form-data; name="ab"',
			'',
			'123',
			"--" + boundary,
			'Content-Disposition:form-data;name="c[d]"',
			'',
			'234',
			"--" + boundary,
			'Content-Disposition: form-data; name="file_0"; filename="ABC.txt"',
			'Content-Type: application/octet-stream',
			'',
			'A',
			"--" + boundary,
			'Content-Disposition: form-data; name="file_1"; filename="abc.txt"',
			'Content-Type: application/octet-stream',
			'',
			'abcdefgh',
			"--" + boundary + "--"
		].join('\r\n')
		, req = {
			headers: {
				"content-type": "multipart/form-data"
			}
		}
		, result = {
			ab: "123",
			c: { d: "234" }
		}
		, files = [
			{ name: "file_0", filename: "ABC.txt" , tmp: "" },
			{ name: "file_1", filename: "abc.txt" , tmp: "" }
		]

		assert.plan(8)

		req.body = body
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,2}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,3}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,4}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,5}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,8}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,16}/g)
		assert.fakeReq(req, result, files)
	})

	it("should parse multipart/form-data without files", function(assert) {
		var boundary = "--0000012345z"
		, body = [
			"--" + boundary,
			'Content-Disposition: form-data; name="ab[]"',
			'',
			'123',
			"--" + boundary,
			'Content-Disposition: form-data; name="ab[]"',
			'',
			'456',
			"--" + boundary,
			'Content-Disposition:form-data;name="c[d][e]"',
			'',
			'234',
			"--" + boundary + "--"
		].join('\r\n')
		, req = {
			headers: {
				"content-type": "multipart/form-data"
			}
		}
		, result = {
			ab: ["123", "456"],
			c: { d: {e: "234"} }
		}
		, files = null

		assert.plan(7)

		req.body = body
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,2}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,3}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,4}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,8}/g)
		assert.fakeReq(req, result, files)

		req.body = body.match(/[\s\S]{1,18}/g)
		assert.fakeReq(req, result, files)
	})

	it("handle errors", function(assert) {
		var boundary = "--abcdefghi"

		assert.plan(7)

		assert.fakeReq({
			headers: {
				"content-encoding": "bad-encoding",
				"content-type": "application/json"
			},
			body: ''
		}, null, null, "Unsupported Media Type" )

		assert.fakeReq({
			headers: {
			},
			body: ''
		}, null, null, "Unsupported Media Type" )

		assert.fakeReq({
			headers: {
				"content-type": "application/json"
			},
			body: 'a=1&b=2'
		}, null, null, "Unexpected token a in JSON at position 0" )

		assert.fakeReq({
			headers: {
				"content-type": "multipart/form-data"
			},
			body: [
				"--" + boundary,
				'Content-Disposition: form-data; name="a"',
				'',
				'A',
				"--" + boundary,
				'Content-Disposition: form-data; name="b"',
				'',
				'B',
				"--" + boundary,
				'Content-Disposition: form-data; name="c"',
				'',
				'C',
				"--" + boundary,
				'Content-Disposition:form-data;name="d"',
				'',
				'D',
				"--" + boundary,
				'Content-Disposition:form-data;name="e"',
				'',
				'E',
				"--" + boundary + "--"
			].join('\r\n')
		}, null, null, "maxFields exceeded", { maxFields: 4 })

		assert.fakeReq({
			headers: {
				"content-type": "multipart/form-data"
			},
			body: [
				"--" + boundary,
				'Content-Disposition: form-data; name="file_0"; filename="A.txt"',
				'Content-Type: application/octet-stream',
				'',
				'A',
				"--" + boundary,
				'Content-Disposition: form-data; name="file_1"; filename="B.txt"',
				'Content-Type: application/octet-stream',
				'',
				'B',
				"--" + boundary,
				'Content-Disposition: form-data; name="file_2"; filename="C.txt"',
				'Content-Type: application/octet-stream',
				'',
				'C',
				"--" + boundary + "--"
			].join('\r\n')
		}, null, null, "maxFiles exceeded" )

		assert.fakeReq({
			headers: {
				"content-type": "application/json"
			},
			body: new Array(100).join(boundary)
		}, null, null, "Payload Too Large" )

		assert.fakeReq({
			headers: {
				"content-type": "application/json"
			},
			body: "ab"
		}, null, null, "Payload Too Large", { maxBodySize: 1 } )

	})


	function fakeReq(opts, expected, _files, _err, reqOpts) {
		var assert = this
		, req = new stream.Readable()
		, junks = Array.isArray(opts.body) ? opts.body : [ opts.body ]

		req.getContent = content
		req.headers = opts.headers
		req.opts = {
			maxBodySize: 1000,
			maxFiles: 2
		}

		req.getContent(function(err, body, files, negod) {
			assert.planned += 1
			assert.equal(err && err.message || err, _err || null)

			assert.planned += 1
			assert.equal(files ? files.map(function(negod) {
				return {
					name: negod.name,
					filename: negod.filename,
					//content: negod.content,
					tmp: ""
				}
			}) : null, _files || null)

			if (files) {
				fs.unlinkSync(files[0].tmp)
				files[0].tmp = null
			}

			assert.equal(body, expected)
		}, reqOpts)

		junks.forEach(function(junk) {
			if (junk) req.push(junk)
		})
		req.push(null)
		return req
	}
})

