
var defaultReqOpts = {
	accept: {
		"application/json": function(str) {
			return JSON.parse(str || "{}")
		},
		"application/x-www-form-urlencoded": querystring,
		"multipart/*;boundary=": true,
		"text/csv;br=\"\r\n\";delimiter=\",\";fields=;header=;NULL=;select=": require("./csv.js").decode
	},
	decompress: false,
	maxBodySize:  1e6,
	maxNameSize:  100,  // TODO:2023-11-03:lauri:Not implemented
	maxFields:    1000,
	maxFieldSize: 1000, // TODO:2023-11-03:lauri:Not implemented
	maxFiles:     1000,
	maxFileSize:  Infinity
}
, fs = require("fs")
, path = require("path")
, Writable = require("stream").Writable
, accept = require("./accept.js").accept
, util = require("./util")
, rnrn = Buffer.from("\r\n\r\n")
, negotiateDisposition = accept([
	"form-data;name=;filename="
])
, seq = 0
, decompress = {
	br: "createBrotliDecompress",
	gzip: "createUnzip",
	deflate: "createUnzip"
}
, isArray = Array.isArray
, keyRe = /\[(.*?)\]/g

makeTable(rnrn)

module.exports = getContent
getContent.querystring = querystring

function getContent(next, reqOpts) {
	reqOpts = util.deepAssign({defaults: defaultReqOpts}, defaultReqOpts, reqOpts)

	if (!reqOpts._accept) reqOpts._accept = accept(reqOpts.accept)

	var i, tmp
	, req = this
	, head = req.headers
	, negod = reqOpts._accept(head["content-type"] || head.accept)
	, stream = req
	, maxBodySize = util.num(reqOpts.maxBodySize, req.opts.maxBodySize, 1e6)

	if (!negod.o) {
		return handleEnd("Unsupported Media Type")
	}

	req.body = {}

	if (head["content-encoding"]) {
		tmp = head["content-encoding"].split(/\W+/)
		for (i = tmp.length; i--; ) {
			if ((reqOpts.decompress || req.opts.decompress) && decompress[tmp[i]]) {
				stream = stream.pipe(require("zlib")[decompress[tmp[i]]]({
					maxOutputLength: maxBodySize
				}))
			} else if (tmp[i] && tmp[i] !== "identity") {
				return handleEnd("Unsupported Media Type")
			}
		}
	}

	if (negod.type === "multipart") {
		req.res.on("close", function() {
			if (req.files) for (var i = req.files.length; i--; ) {
				if (req.files[i].tmp) fs.unlink(req.files[i].tmp, util.nop)
			}
		})
		stream = stream
		.pipe(multipart(negod.boundary, reqOpts, req))
		.on("finish", handleEnd)
	} else {
		tmp = ""
		stream.on("data", function handleData(data) {
			tmp += data
			// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
			if (tmp.length > maxBodySize) {
				handleEnd("Payload Too Large") // 431 Payload Too Large
				stream.destroy()
			}
		})
		.on("end", handleEnd)
	}

	stream.on("error", handleEnd)

	function handleEnd(err) {
		if (next) {
			if (err) next(err)
			else try {
				if (typeof negod.o === "function") req.body = negod.o(tmp, negod)
				next(null, req.body, req.files, negod)
			} catch (e) {
				next(e)
			}
			next = null
		}
	}
}

function querystring(str) {
	var step, map = {}
	if (typeof str === "string" && str !== "") {
		var arr = str.split("&")
		, i = 0
		, l = arr.length
		for (; i < l; ) {
			step = arr[i++].replace(/\+/g, " ").split("=")
			setForm(map, unescape(step[0]), unescape(step[1] || ""))
		}
	}
	return map
}

function setForm(map, key_, val) {
	for (var match, key = key_, step = map; (match = keyRe.exec(key_)); ) {
		if (step === map) key = key.slice(0, match.index)
		match = match[1]
		step = step[key] || (
			step[key] = match && +match != match ? {} : []
		)
		key = match
	}
	if (isArray(step)) {
		step.push(val)
	} else if (isArray(step[key])) {
		step[key].push(val)
	} else {
		step[key] = step[key] != null ? [step[key], val] : val
	}
}

function multipart(boundary, reqOpts, req) {
	makeTable(boundary = Buffer.from("\r\n--" + boundary))

	var headers, fileStream
	, negod = reqOpts.preamble && { preamble: true }
	, needle = boundary
	, bufs = [rnrn.slice(2)]
	, bufsBytes = 2
	, nextPos = needle.length - 3
	, remainingFields = util.num(reqOpts.maxFields, req.opts.maxFields, 1000)
	, remainingFiles = util.num(reqOpts.maxFiles, req.opts.maxFiles, 1000)
	, savePath = path.join(reqOpts.tmp || req.opts.tmp || require("os").tmpdir(), "up-" + process.pid + "-" + (seq++))
	, writable = {
		write: function(chunk, enc, cb) {
			var buf, bufNum, i, j
			, pos = nextPos
			, len = chunk.length
			, last = needle.readUInt8(needle.length - 1)
			, cut = 0

			if (pos > len) {
				bufs.push(chunk)
				bufsBytes += len
				nextPos -= len
				return cb()
			}

			jump:for (; pos < len; ) {
				if (chunk.readUInt8(pos) === last) {
					buf = chunk
					bufNum = bufs.length
					i = needle.length - 1
					j = pos
					for (; i > 0; ) {
						if (j < 1 && bufNum > 0) {
							buf = bufs[--bufNum]
							j = buf.length
						}
						if (needle.readUInt8(--i) !== buf.readUInt8(--j)) {
							pos += needle.jump[last]
							continue jump
						}
					}
					// match found
					if (bufsBytes > 0) {
						bufs.push(chunk)
						buf = Buffer.concat(bufs, pos + bufsBytes - needle.length + 1)
						bufsBytes = bufs.length = 0
					} else if (cut > 0) {
						buf = buf.slice(cut, pos - needle.length + 1)
					}
					if (needle === boundary) {
						if (negod) {
							if (remainingFields-- < 1) return cb({ code: 413, message: "maxFields exceeded"})
							if (negod.preamble) {
								req.emit("preamble", req.preamble = buf.toString("utf8", 2))
							} else {
								setForm(req.body, negod.name, buf.toString())
							}
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

						if (negod.filename) {
							if (remainingFiles-- < 1) return cb({ code: 413, message: "maxFiles exceeded"})
							if (!req.files) req.files = []
							req.files.push(negod)
							negod.tmp = savePath + "-" + remainingFiles
							req.emit("file", negod, saveTo)
							if (!fileStream) {
								saveTo(negod.tmp)
							}
						}
						needle = boundary
					}
					cut = pos + 1
					last = needle.readUInt8(needle.length - 1)
					pos += needle.length
				} else {
					pos += needle.jump[chunk.readUInt8(pos)]
				}
			}

			nextPos = pos - len

			if (cut < len) {
				bufs.push(cut ? chunk.slice(cut) : chunk)
				bufsBytes += bufs[bufs.length - 1].length
			}

			writeChunk()

			function writeChunk() {
				if (fileStream && bufs[1] && bufsBytes - bufs[0].length > needle.length) {
					bufsBytes -= bufs[0].length
					fileStream.write(bufs.shift(), writeChunk)
				} else {
					process.nextTick(cb)
				}
			}
		}
	}

	if (reqOpts.epilogue) {
		writable.final = function(cb) {
			req.epilogue = Buffer.concat(bufs).toString("utf8", 4)
			cb()
		}
	}

	var stream = new Writable(writable)
	return stream

	function saveTo(stream) {
		fileStream = (
			typeof stream === "string" ?
			fs.createWriteStream(negod.tmp = stream) :
			stream
		)
		negod = null
	}
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
	var i = 0
	, pos = buf.length - 1
	, jump = buf.jump = new Uint8Array(256).fill(pos + 1)

	for (; i < pos; ) {
		jump[buf.readUInt8(i)] = pos - i++
	}
}


