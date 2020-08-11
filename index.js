
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

if (!fs.copyFileSync) {
	// Added in: v8.5.0
	fs.copyFileSync = function(src, dest, mode) {
		fs.writeFileSync(dest, fs.readFileSync(src))
	}
}


