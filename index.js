
var fs = require("fs")

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


module.exports.version = process.versions.litejs = require("./package.json").version
module.exports.server = require("./server")
module.exports.log = require("./log")



