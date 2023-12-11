
var crypto = require("crypto")
, numRe = /^(-?\d+(?:\.\d*)?) *([kMGTP]i?|sec|min|hr|day|week|month|year|).?$/
, numMap = {
	"": 1,
	sec: 1e3, min: 6e4, hr: 36e5, day: 864e5, week: 6048e5, month: 2629742400, year: 31556908800,
	k: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15,
	ki: 1024,
	Mi: 1048576,
	Gi: 1073741824,
	Ti: 1099511627776,
	Pi: 1125899906842624
}
, hasOwn = numMap.hasOwnProperty
, uuidNamespaces = {
	dns:  uuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8"),
	url:  uuid("6ba7b811-9dad-11d1-80b4-00c04fd430c8"),
	oid:  uuid("6ba7b812-9dad-11d1-80b4-00c04fd430c8"),
	x500: uuid("6ba7b814-9dad-11d1-80b4-00c04fd430c8"),
	null: uuid("00000000-0000-0000-0000-000000000000")
}

exports.deepAssign = deepAssign
exports.nop = nop
exports.num = num
exports.rand = rand
exports.round = round
exports.uuid4 = uuid4
exports.uuid5 = uuid5
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


function deepAssign(to) {
	if (to !== Object.prototype) for (var key, from, a = arguments, i = 1, len = a.length; i < len; ) {
		if ((from = a[i++])) for (key in from) if (hasOwn.call(from, key)) {
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

function uuid(data, ver) {
	if (typeof data == "string") {
		data = data.replace(/-/g, "")
		for (var i = 16, arr = new Uint8Array(i); i--; ) {
			arr[i] = parseInt(data.slice(i * 2, i * 2 + 2), 16)
		}
		data = arr
	}
	if (ver) {
		data[6] = (data[6] & 0x0f) | (ver << 4)
		data[8] = (data[8] & 0x3f) | 0x80
	}
	data.toString = uuidToString
	return data
}
function uuidToString() {
	for (var arr = this, len = arr.length, out = new Array(len); len--; ) {
		out[len] = (256 + arr[len]).toString(16).slice(1)
	}
	out[3] += "-"
	out[5] += "-"
	out[7] += "-"
	out[9] += "-"
	return out.join("")
}
function uuid4() {
	return uuid(crypto.getRandomValues(new Uint8Array(16)), 4)
}
function uuid5(ns, name) {
	name = unescape(encodeURIComponent(name))
	var nameLen = name.length
	, data = new Uint8Array(16 + nameLen)
	for (data.set(uuidNamespaces[ns] || (uuidNamespaces[ns] = uuid(ns))); nameLen--; ) {
		data[nameLen + 16] = name.charCodeAt(nameLen)
	}
	return uuid(crypto.createHash("sha1").update(data).digest().slice(0, 16), 5)
}

function rand(min, max) {
	if (typeof max === "number") return Math.random() * (max - min) + min
	for (var out = ""; out.length < min; ) {
		out += Math.random().toString(36).slice(2)
	}
	return out.slice(-min)
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
	, mask = bits < 33 ? (-1 << (32 - bits)) >>> 0 : ip2int(bits)
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

