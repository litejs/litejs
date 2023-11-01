
var fs = require("fs")

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

/* ignore next */
if (!fs.copyFile) {
	// Added in: v8.5.0
	fs.copyFile = function(src, dest, mode, cb) {
		if (typeof mode === "function") {
			cb = mode
		}
		var source = fs.createReadStream(src)
		if (cb) {
			source.on("end", cb)
		}
		source.pipe(fs.createWriteStream(dest))
	}
	fs.copyFileSync = function(src, dest) {
		fs.writeFileSync(dest, fs.readFileSync(src))
	}
}

exports.version = process.versions.litejs = require("./package.json").version
exports.createServer = require("./server.js")
exports.createStatic = require("./static.js")
exports.log = require("./log.js")


