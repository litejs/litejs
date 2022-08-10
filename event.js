
!function(exports) {
	var empty = []
	, Event = exports.Event || exports

	Event.Emitter = EventEmitter
	Event.asEmitter = asEmitter

	function EventEmitter() {}

	function asEmitter(obj) {
		obj.on = on
		obj.off = off
		obj.one = one
		obj.emit = emit
		obj.listen = listen
		obj.unlisten = unlisten
	}
	asEmitter(EventEmitter.prototype)

	function on(type, fn, scope, _origin) {
		var emitter = this === exports ? empty : this
		, events = emitter._e || (emitter._e = Object.create(null))
		if (type && fn) {
			if (typeof fn === "string") fn = emit.bind(emitter, fn)
			emit.call(emitter, "newListener", type, fn, scope, _origin)
			;(events[type] || (events[type] = [])).unshift(scope, _origin, fn)
		}
		return this
	}

	function off(type, fn, scope) {
		var i, args
		, emitter = this === exports ? empty : this
		, events = emitter._e && emitter._e[type]
		if (events) {
			for (i = events.length - 2; i > 0; i -= 3) {
				if ((events[i + 1] === fn || events[i] === fn) && events[i - 1] == scope) {
					args = events.splice(i - 1, 3)
					emit.call(emitter, "removeListener", type, args[2], args[0], args[1])
					if (fn) break
				}
			}
		}
		return this
	}

	function one(type, fn, scope) {
		var emitter = this === exports ? empty : this
		function remove() {
			off.call(emitter, type, fn, scope)
			off.call(emitter, type, remove, scope)
		}
		on.call(emitter, type, remove, scope)
		on.call(emitter, type, fn, scope)
		return this
	}

	// emitNext
	// emitLate

	function emit(type) {
		var args, i
		, emitter = this === exports ? empty : this
		, _e = emitter._e
		, arr = _e ? (_e[type] || empty).concat(_e["*"] || empty) : empty
		if ((_e = arr.length)) {
			for (i = _e - 1, args = arr.slice.call(arguments, 1); i > 1; i -= 3) {
				arr[i] && arr[i].apply(arr[i - 2] || emitter, args)
			}
		}
		return _e / 3
	}

	function listen(emitter, ev, fn, scope, _origin) {
		if (emitter) {
			on.call(emitter, ev, fn, scope)
			;(this._l || (this._l = [])).push([emitter, ev, fn, scope, _origin])
		}
		return this
	}

	function unlisten(key) {
		var a, i
		, listening = this._l
		if (listening) for (i = listening.length; i--; ) {
			a = listening[i]
			if (key === "*" || a.indexOf(key) > -1) {
				listening.splice(i, 1)
				off.call(a[0], a[1], a[2], a[3])
			}
		}
		return this
	}

// `this` refers to the `window` in browser and to the `exports` in Node.js.
}(this) // jshint ignore:line

