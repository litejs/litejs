
var fs = require("fs")
, Writable = require("stream").Writable
, accept = require("./accept.js").accept
, querystring = require("../lib/querystring")
, rnrn = Buffer.from("\r\n\r\n")
, negotiateContent = accept({
	'application/json': function(str) {
		return JSON.parse(str || "{}")
	},
	'application/x-www-form-urlencoded': function(str) {
		return querystring.parse(str)
	},
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
	'multipart/*;boundary=': null
})
, negotiateDisposition = accept([
	'form-data;name="";filename=""'
])
, seq = 0
, tmpdir = (
	process.env.TMPDIR ||
	process.env.TEMP ||
	process.env.TMP ||
	(
		process.platform === "win32" ?
		(process.env.SystemRoot || process.env.windir) + "\\temp" :
		"/tmp"
	)
).replace(/([^:])[\/\\]+$/, "$1")


module.exports = getContent
getContent.multipart = multipart


makeTable(rnrn)

function getContent(next, reqOpts) {
	var i, tmp
	, req = this
	, head = req.headers
	, negod = negotiateContent(head["content-type"] || head.accept || "*")
	, stream = req

	req.body = {}

	if (head["content-encoding"]) {
		tmp = head["content-encoding"].split(/\W+/)
		for (i = tmp.length; i--; ) {
			if (tmp[i] === "gzip" || tmp[i] === "deflate") {
				// Decompress Gzip or Deflate by auto-detecting the header
				stream = stream.pipe(zlib.createUnzip())
			} else if (tmp[i] && tmp[i] !== "identity") {
				throw "Unsupported Media Type"
			}
		}
	}

	if (negod.type === "multipart") {
		stream = stream.pipe(multipart(negod.boundary, reqOpts || {}, req))

		stream.on("field", function(negod) {
			var step = req.body
			, key = negod.name
			key.replace(/\[(.*?)\]/g, function(_, _key, offset) {
				if (step == req.body) key = key.slice(0, offset)
				step = step[key] || (step[key] = _key && +_key != _key ? {} : [])
				key = _key
			})
			step[key || step.length] = negod.content.toString()
		})
		stream.on("file", function(negod) {
			if (!req.files) req.files = []
			req.files.push(negod)
		})
		stream.on("finish", function() {
			next(null, req.body, req.files)
			if (req.files) {
				for (var i = req.files.length; i--; ) {
					if (req.files[i].tmp) fs.unlink(req.files[i].tmp, nop)
				}
			}
		})
	} else {
		tmp = ""
		stream.on("data", function handleData(data) {
			tmp += data
			// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
			if (tmp.length > req.opts.maxBodySize) {
				stream.destroy("Payload Too Large") // 431 Payload Too Large
			}
		})
		.on("end", handleEnd)
	}

	stream.on("error", next)

	function handleEnd() {
		try {
			req.body = typeof negod.o === "function" ? negod.o(tmp) : tmp
			next(null, req.body, req.files, negod)
		} catch (e) {
			next(e)
		}
	}
}

function multipart(boundary, reqOpts, req) {
	// nodejs HTTP_MAX_HEADER_SIZE (80*1024)
	// { "name": "in[]", filename: "a.jpg", tmp: "/tmp/a.123", size: 123 }
	if (typeof boundary === "string") {
		boundary = Buffer.from("\r\n--" + boundary)
	}

	makeTable(boundary)

	var headers, fileStream
	, negod = reqOpts.preamble && { preamble: true }
	, needle = boundary
	, bufs = [rnrn.slice(2)]
	, bufsBytes = 2
	, nextPos = needle.length - 3
	, remainingFields = number(reqOpts.maxFields, req.opts.maxFields, 1000)
	, remainingFiles = number(reqOpts.maxFiles, req.opts.maxFiles, 1000)
	, savePath = (reqOpts.path || tmpdir + "/up-") + process.pid + "-" + (seq++) + "-"

	return new Writable({
		write: function(chunk, enc, cb) {
			var buf, bufNum, i, j
			, writable = this
			, pos = nextPos
			, len = chunk.length
			, last = needle[needle.length - 1]
			, cut = 0

			if (pos > len) {
				bufs.push(chunk)
				bufsBytes += len
				nextPos -= len
				return cb()
			}

			jump:for (; pos < len; ) {
				if (chunk[pos] === last) {
					buf = chunk
					bufNum = bufs.length
					i = needle.length - 1
					j = pos
					for (; i > 0; ) {
						if (j < 1 && bufNum > 0) {
							buf = bufs[--bufNum]
							j = buf.length
						}
						if (needle[--i] !== buf[--j]) {
							pos += needle.jump[last]
							continue jump
						}
					}
					// match found
					if (bufsBytes > 0) {
						bufs.push(chunk)
						buf = Buffer.concat(bufs, pos + bufsBytes - needle.length + 1)
						bufsBytes = bufs.length = 0
					} else if (cut > 0 || pos < len - 1) {
						buf = buf.slice(cut, pos - needle.length + 1)
					}
					if (needle === boundary) {
						if (negod) {
							if (!remainingFields--) return writable.destroy({ code: 413, message: "maxFields exceeded"})
							negod.content = buf
							writable.emit(negod.filename === "" ? "field" : "file", negod)
							negod = null
						} else if (fileStream) {
							fileStream.end(buf)
							fileStream = null
						}
						needle = rnrn
					} else {
						// content start
						headers = parseHeaders(buf.toString())
						negod = negotiateDisposition(headers["content-disposition"])
						negod.headers = headers

						if (negod.filename && reqOpts.path !== null) {
							if (!remainingFiles--) return writable.destroy({ code: 413, message: "maxFiles exceeded"})
							writable.emit("file", negod, saveTo)
							if (!fileStream) {
								saveTo(savePath + remainingFiles)
							}
						}
						needle = boundary
					}
					cut = pos + 1
					last = needle[needle.length - 1]
					pos += needle.length
				} else {
					pos += needle.jump[chunk[pos]]
				}
			}

			nextPos = pos - len

			if (cut < len) {
				bufs.push(cut ? chunk.slice(cut) : chunk)
				bufsBytes += bufs[bufs.length - 1].length
			}

			if (fileStream) {
				for (; bufs.length > 1 && bufsBytes - bufs[bufs.length - 1].length > needle.length; ) {
					if (!fileStream.write(bufs.pop())) {
						return fileStream.once("drain", cb)
					}
				}
			}

			cb()
		}
	})

	function saveTo(stream) {
		fileStream = (
			typeof stream === "string" ?
			fs.createWriteStream(negod.tmp = stream) :
			stream
		)
		negod = null
	}
}

function nop() {}

function number(a, b, c) {
	return (
		typeof a === "number" ? a :
		typeof b === "number" ? b :
		c
	)
}

// multipart/form-data part accepts only Content-Type, Content-Disposition, and (in limited circumstances) Content-Transfer-Encoding.
// Other header fields MUST NOT be included and MUST be ignored.

// Content-Transfer-Encoding: 7bit / 8bit / binary / quoted-printable / base64 / ietf-token / x-token
//
// User Agents that recognize Multipart/Related will ignore the Content-Disposition header's disposition type.
// Other User Agents will process the Multipart/Related as Multipart/Mixed and may make use of that header's information.

function parseHeaders(str) {
	// 4.8.  Other "Content-" Header Fields
	var i
	, headers = {}
	, lines = str.split("\r\n")
	, len = lines.length
	for (; len; ) {
		i = lines[--len].indexOf(":")
		if (i > 0) {
			headers[
				lines[len].slice(0, i).toLowerCase()
			] = lines[len].slice(i + 1).trim()
		}
	}
	return headers
}

function makeTable(buf) {
	var len = buf.length
	, i = 0
	, pos = len - 1
	, jump = buf.jump = new Uint8Array(256).fill(len)

	for (; i < pos; ++i) {
		jump[buf[i]] = pos - i
	}
}


