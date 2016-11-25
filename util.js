
exports.lineEmitter = lineEmitter
exports.uuid4 = uuid4
exports.rand = rand
exports.round = round
exports.wait = wait
exports.Storage = Storage

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

	function resume() {
		if (!--pending) {
			if (fn) fn.apply(this, result)
		}
	}
	resume.wait = function(pos) {
		++pending
		if (pos === void 0) pos = pending
		return function(err, res) {
			if (err) {
				if (fn) fn.call(this, err)
			} else {
				result[pos] = res
				resume()
			}
		}
	}
	return resume
}


function Storage() {
	this.data = {}
}

Storage.prototype = {
	get: function(key, next) {
		var obj = this.data[key]
		, err = obj ? null : "Item not found"
		next(err, obj)
	},
	set: function(key, val, next) {
		this.data[key] = val
		next(null)
	},
	rename: function(key, newKey, next) {
		this.data[newKey] = this.data[key]
		delete this.data[key]
		next(null)
	}
}

