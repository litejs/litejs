
var it = describe.it

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
	, util = require("../util")

	try {
		zlib = require("zlib")
	} catch(e) {
		zlib = {
			brotliCompressSync: function(a){return a},
			deflateSync: function(a){return a}
		}
	}

	describe.assert.fakeReq = fakeReq


	it("should accept application/json", function(assert) {
		assert.plan(3)

		assert.fakeReq({
			headers: {
				"accept": "application/json",
				"content-encoding": "identity"
			},
			body: '{"a":1}'
		}, {body: {a:1}})

		assert.fakeReq({
			headers: { "content-type": "application/json" },
		}, {body:{}})

		assert.fakeReq({
			headers: {
				"content-type": "application/json",
				"content-encoding": "deflate, identity, gzip"
			},
			body: zlib.gzipSync(zlib.deflateSync('{"a":2}'))
		}, {body: {a:2}})

	})

	it("should accept text/csv", function(assert) {
		assert.plan(2)
		assert.fakeReq({
			headers: { "content-type": "text/csv" },
			body: 'a,b\n1,2'
		}, {body: [["a", "b"], ["1", "2"]]})
		assert.fakeReq({
			headers: { "content-type": "text/csv;header=present" },
			body: 'a,b\n1,2'
		}, {body: [{a:"1", b:"2"}]})
	})

	it("should accept application/x-www-form-urlencoded", function(assert) {
		assert.plan(1)
		assert.fakeReq({
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: 'a=1&b=2'
		}, {body: {a:"1", b:"2"}})
	})

	it ("should parse querystring", function(assert) {
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
				{"a":{"b":{"c":"123"}}},
				"a[b][c]=123"
			], [
				{"map": {"a":"1","b":["2","3"]}},
				"map[a]=1&map[b]=2&map[b]=3",
				"map[a]=1&map[b][]=2&map[b][]=3",
				"map[a]=1&map[b][0]=2&map[b][1]=3"
			], [
				{"my weird field": "q=1!2\"'w$5&7/z&8)?"},
				'my+weird+field=q%3D1%212%22%27w%245%267%2Fz%268%29%3F',
				'my%20weird%20field=q%3D1!2%22\'w%245%267%2Fz%268)%3F'
			], [
				{"a": ["1", "2", "", ""]},
				"a=1&a=2&a&a="
			]
		]
		, i = 0

		for (; test = tests[i++]; ) {
			for (j = 1; j < test.length; ) {
				assert.equal(content.querystring(test[j++]), test[0])
			}
		}

		assert.end()
	})
	it("should parse multipart/form-data with files", function(assert) {
		var r
		, boundary = "--" + Math.random().toString(35).slice(2) + Math.random().toString(35).slice(2) + "z"
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
			'abcdefgabcdefgabcdefgabcdefgabcdefgabcdefgabcdefgabcdefgabcdefgabcdefgabcdefghhhhhhhhhhhabcdefgh',
			"--" + boundary + "--"
		].join('\r\n')
		, req = {
			headers: {
				"content-type": "multipart/form-data;boundary=" + boundary
			}
		}
		, result = {
			body: {
				ab: "123",
				c: { d: "234" }
			},
			files: [
				{ name: "file_0", filename: "ABC.txt" , tmp: "" },
				{ name: "file_1", filename: "abc.txt" , tmp: "" }
			]
		}

		assert.plan(8)

		req.body = body
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,2}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,3}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,4}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,5}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,8}/g)
		r = assert.fakeReq(req, result)
		r.on("file", function(negod, saveTo) {
			var stream = fs.createWriteStream(negod.tmp += ".2")
			stream._writableState.highWaterMark = 1
			saveTo(stream)
		})

		req.body = body.match(/[\s\S]{1,16}/g)

		r = assert.fakeReq(req, result)
		r.on("file", function(negod, saveTo) {
			saveTo(negod.tmp + ".2")
		})
	})

	it("should parse multipart/form-data without files", function(assert) {
		var boundary = "--0000012345z"
		, body = [
			"This is the preamble.",
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
			"--" + boundary + "--",
			"This is the epilogue."
		].join('\r\n')
		, req = {
			headers: {
				"content-type": "multipart/form-data;boundary=" + boundary
			}
		}
		, result = {
			body: {
				ab: ["123", "456"],
				c: { d: {e: "234"} }
			}
		}

		assert.plan(7)

		req.body = body
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,2}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,3}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,4}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,8}/g)
		assert.fakeReq(req, result)

		req.body = body.match(/[\s\S]{1,18}/g)
		req.preamble = "This is the preamble."
		req.epilogue = "This is the epilogue."
		assert.fakeReq(req, result, {preamble:true, epilogue: true})
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
		}, { error: "Unsupported Media Type" })

		assert.fakeReq({
			headers: {},
			body: ''
		}, { error: "Unsupported Media Type" })

		assert.fakeReq({
			headers: {
				"content-type": "application/json"
			},
			body: 'a=1&b=2'
		}, { error: [
			"Unexpected token 'a', \"a=1&b=2\" is not valid JSON",
			"Unexpected token a in JSON at position 0"
		]})

		assert.fakeReq({
			headers: {
				"content-type": "multipart/form-data;boundary=" + boundary
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
		}, { error: "maxFields exceeded" }, { maxFields: 4 })

		assert.fakeReq({
			headers: {
				"content-type": "multipart/form-data;boundary=" + boundary
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
		}, { error: "maxFiles exceeded" } )

		assert.fakeReq({
			headers: {
				"content-type": "application/json"
			},
			body: new Array(100).join(boundary)
		}, { error: "Payload Too Large" } )

		assert.fakeReq({
			headers: {
				"content-type": "application/json"
			},
			body: "ab"
		}, { error: "Payload Too Large" }, { maxBodySize: 1 } )

	})


	function fakeReq(req_, expected, reqOpts) {
		var assert = this
		, req = new stream.Readable()
		, junks = Array.isArray(req_.body) ? req_.body : [ req_.body ]

		req.getContent = content
		req.headers = req_.headers || {}
		req.opts = util.deepAssign({
			compress: true,
			tmp: "/tmp/" + process.pid,
			maxBodySize: 1000,
			maxFiles: 2
		}, req_)
		req.res = {on: function(ev, fn) {
			if (ev === "close") req.on("end", function() {
				process.nextTick(fn)
			})
		}}

		req.getContent(function(err, body, files, negod) {
			assert.planned += 1
			if (expected.error) {
				assert.anyOf(
					err && err.message || err,
					Array.isArray(expected.error) ? expected.error : [expected.error]
				)
			} else {
				assert.equal(err, null)
			}

			assert.planned += 1
			assert.equal(files ? files.map(function(negod) {
				return {
					name: negod.name,
					filename: negod.filename,
					//content: negod.content,
					tmp: ""
				}
			}) : null, expected.files || null)

			if (files) {
				try {
					fs.unlinkSync(files[0].tmp)
				} catch(e) {}
				files[0].tmp = null
			}

			if (reqOpts && reqOpts.preamble) {
				assert.planned += 1
				assert.equal(req.preamble, req_.preamble)
			}

			if (reqOpts && reqOpts.epilogue) {
				assert.planned += 1
				assert.equal(req.epilogue, req_.epilogue)
			}

			assert.equal(body, expected.body)
		}, reqOpts)

		junks.forEach(function(junk) {
			if (junk) req.push(junk)
		})
		req.push(null)
		return req
	}
})


