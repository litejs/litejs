


!function(exports) {
	var Event = exports.Event || (exports.Event = {})
	, empty = []

	Event.Emitter = {
		on: on,
		off: off,
		one: one,
		emit: emit,
		listen: listen,
		unlisten: unlisten
	}

	function on(type, fn, scope, _origin) {
		var emitter = this
		, events = emitter._e || (emitter._e = {})
		;(events[type] || (events[type] = [])).unshift(scope, _origin, fn)
		return emitter
	}

	function off(type, fn, scope) {
		var i
		, emitter = this
		, events = emitter._e && emitter._e[type]
		if (events) {
			if (fn) for (i = events.length; i--; i--) {
				if ((events[i--] === fn || events[i] === fn) && events[i - 1] == scope) {
					events.splice(i - 1, 3)
					break
				}
			} else {
				events.length = 0
			}
		}
		return emitter
	}

	function one(type, fn, scope) {
		var emitter = this
		function remove() {
			emitter.off(type, fn, scope).off(type, remove, scope)
		}
		return emitter.on(type, remove, scope).on(type, fn, scope)
	}

	function emit(type) {
		var args, i
		, emitter = this
		, _e = emitter._e
		, arr = _e ? (_e[type] || empty).concat(_e["*"] || empty) : empty
		if (i = arr.length) {
			for (args = arr.slice.call(arguments, 1); i--; ) {
				arr[i--].apply(arr[--i] || emitter, args)
			}
		}
		return emitter
	}

	function listen(emitter, ev, fn, scope, _origin) {
		if (emitter) {
			emitter.on(ev, fn, scope)
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
				a[0].off(a[1], a[2], a[3])
			}
		}
		return this
	}
// `this` refers to the `window` in browser and to the `exports` in Node.js.
}(this)



