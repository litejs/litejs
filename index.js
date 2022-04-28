
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

if (!process.versions) {
	process.versions = {}
	if (process.iotjs) {
		process.versions.iotjs = process.version
	}
}

if (!process.hrtime) {
	// for iotjs
	process.hrtime = function(diff) {
		var now = (new Date()).getTime() * 1e-3
		, sec = Math.floor(now)
		, nano = Math.floor((now%1) * 1e9)
		if (diff) {
			sec -= diff[0]
			nano -= diff[1]
			if (nano < 0) {
				sec--
				nano += 1e9
			}
		}
		return [sec, nano]
	}
}

if (!Object.assign) {
	Object.assign = function(a) {
		// jshint boss:true
		var t,k,i=1,A=arguments,l=A.length
		for (; i<l; ) if (t=A[i++]) for(k in t) if(Object.prototype.hasOwnProperty.call(t,k)) {
			a[k]=t[k]
		}
		return a
	}
}


module.exports.version = process.versions.litejs = require("./package.json").version
module.exports.server = require("./server")
module.exports.log = require("./log")



