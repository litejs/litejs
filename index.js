

/* ignore next */
if (!Buffer.from) {
	// Added in: v5.10.0
	Buffer.from = Buffer.allocUnsafe = function(arg, enc, len) {
		return new Buffer(arg, enc, len)
	}
	Buffer.allocUnsafe = function(len) {
		return new Buffer(len)
	}
	Buffer.alloc = function (len, fill, enc) {
		return new Buffer(len).fill(fill, enc)
	}
}

exports.version = process.versions.litejs = require("./package.json").version
exports.createServer = require("./server.js")
exports.createStatic = require("./static.js")
exports.log = require("./log.js")


