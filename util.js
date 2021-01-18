
exports.deepAssign = deepAssign
exports.lineEmitter = lineEmitter
exports.nop = nop
exports.num = num
exports.rand = rand
exports.round = round
exports.uuid4 = uuid4
exports.wait = wait

exports.urlRe = /^([-.\da-z]+:)?\/\/(([\da-z.]*)(?::(\d+))?)(\/.*?)(\?.*?)?(#.*)?$/
exports.domainRe = /^(?:(?:xn-|[a-z\d]+)(?:-[a-z\d]+)*(?:\.(?=.)|$)){2,}/i
exports.ipv4Re = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?=.)|$)){4}$/
exports.ipv6Re = /^((?=.*::)(([1-9a-f][\da-f]{0,3}|0|)(:(?=[^:])|::(?!.*::)|$)){1,8}|([\da-f]{1,4}(:(?=[^:])|$)){8})$/i
exports.buf2ip = buf2ip
exports.int2ip = int2ip
exports.ip2buf = ip2buf
exports.ip2int = ip2int
exports.ipInNet = ipInNet

var hasOwn = {}.hasOwnProperty
, numRe = /^(-?\d+\.?\d*) *(|[kMGTP]i?)$/
, numMap = {
	"": 1,
	k: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15,
	ki: 1024,
	Mi: 1048576,
	Gi: 1073741824,
	Ti: 1099511627776,
	Pi: 1125899906842624
}

function deepAssign(to) {
	if (to !== Object.prototype) for (var key, from, a = arguments, i = 1, len = a.length; i < len; ) {
		if (from = a[i++]) for (key in from) if (hasOwn.call(from, key)) {
			if (from[key] === null) delete to[key]
			else to[key] = (
				from[key] && from[key].constructor === Object ?
				deepAssign(to[key] && to[key].constructor === Object ? to[key] : {}, from[key]) :
				from[key]
			)
		}
	}
	return to
}

// Usage:
// var client = net.connect(soc)
// .on("line", function(line) {})
// lineEmitter(client)

function lineEmitter(emitter, opts) {
	opts = opts || {}

	var leftover = ""
	, separator = opts.separator || /\r?\n/
	, emit = opts.emit || "line"
	, listen = opts.listen || "data"
	, end = opts.end || "end"

	emitter
	.on(listen, lineEmitterData)
	.on(end,  lineEmitterEnd)

	function lineEmitterData(data){
		var lines = (leftover + data).split(separator)

		// keep the last partial line buffered
		leftover = lines.pop()

		for (var i = 0, len = lines.length; i < len; ) {
			this.emit(emit, lines[i++], len)
		}
	}
	function lineEmitterEnd() {
		if (leftover) {
			this.emit(emit, leftover)
		}
		leftover = ""
		emitter
		.removeListener(listen, lineEmitterData)
		.removeListener(end, lineEmitterEnd)
	}
	return emitter
}

function nop() {}

function num(a, b, c) {
	var tmp
	return (
		typeof a === "number" && a === a ? a :
		typeof a === "string" && (tmp = numRe.exec(a)) ? tmp[1] * numMap[tmp[2]] :
		typeof b === "number" && b === b ? b :
		typeof b === "string" && (tmp = numRe.exec(b)) ? tmp[1] * numMap[tmp[2]] :
		c
	)
}

function uuid4(a, b) {
	for (a = b = ""; a++ < 36; ) {
		b += a*51&52 ?  ( a^15 ? 8 ^ Math.random() * (a^20?16:4) : 4 ).toString(16) : "-";
	}
	return b
}

function rand(len) {
	for (var out = ""; out.length < len; ) {
		out += (Date.now() * Math.random()).toString(36).split(".")[0]
	}
	return out.slice(-len)
}

// Rounding Errors
// Number((1.005).toFixed(2)); // 1 instead of 1.01
// Math.round(1.005*100)/100;  // 1 instead of 1.01
// http://www.jacklmoore.com/notes/rounding-in-javascript/
// The rounding problem can be avoided by using numbers represented in exponential notation:

function round(value, decimals) {
	return +(Math.round(value + "e" + decimals) + "e-" + decimals)
}


function wait(fn, _pending) {
	var pending = _pending || 0
	, result = [null]

	if (typeof fn !== "function") throw TypeError("Not a function")

	function resume() {
		if (--pending === 0) {
			fn.apply(this, result)
		}
	}
	resume.wait = function(pos) {
		++pending
		if (pos === void 0) pos = pending
		return function(err, res) {
			if (err) {
				pending = 0
				fn.call(this, err)
			} else {
				result[pos] = res
				resume()
			}
		}
	}
	return resume
}

function ip2int(str) {
	var t = str.split(".")
	return ((t[0] << 24) | (t[1] << 16) | (t[2] << 8 ) | (t[3]))>>>0
}

function int2ip(i) {
	return [i>>>24, (i>>>16)&255, (i>>>8)&255, i&255].join(".")
}

// var re = /^((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])(?:\.(?=.)|$)){4}$/
function ipInNet(ip, cidr) {
	var junks = cidr.split("/")
	, bits = junks[1] || 8 * junks[0].split(".").length
	, mask = bits < 31 ? (-1 << (32 - bits)) >>> 0 : ip2int(bits)
	//, netInt = (ip2int(cidr) & mask) >>> 0
	//, size = 1 << (32 - bits)
	//, last = netInt + size - 1

	return (ip2int(ip) & mask) >>> 0 === (ip2int(junks[0]) & mask) >>> 0
}

function ip2buf(str) {
	var arr = str.split(":", 8)
	, len = arr.length
	if (arr[len - 1].length > 4) {
		return Buffer.from(arr[len - 1].split(".", 4))
	}
	for (; len--; ) {
		arr[len] = (
			arr[len] !== "" ?
			("0000" + arr[len]).slice(-4) :
			"00000000000000000000000000000000".slice(-4*(9 - arr.length))
		)
	}
	return Buffer.from(arr.join(""), "hex")
}

function buf2ip(buf) {
	return buf.length === 4 ? buf.join(".") : buf.toString("hex").replace(/.{4}(?=.)/g, "$&:")
}

