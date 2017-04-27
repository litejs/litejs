


!function(exports) {
	var pointerCache = {}
	, hasOwn = pointerCache.hasOwnProperty

	exports.clone = clone
	exports.merge = merge
	exports.pointer = pointer
	exports.mergePatch = mergePatch
	exports.isObject = isObject

	/**
	 * JSON Pointer
	 * @see https://tools.ietf.org/html/rfc6901
	 */

	function pointerSplit(path) {
		var arr = pointerCache[path] = path.split("/")
		, len = arr.length
		for (; --len; ) {
			arr[len] = arr[len].replace(/~1/g, "/").replace(/~0/g, "~")
		}
		return arr
	}

	function pointer(_obj, _path, value) {
		var obj = _obj
		if (_path) {
			for (
				var key
				, path = pointerCache[_path] || pointerSplit(_path)
				, _set = arguments.length > 2
				, i = 1
				, len = path.length
				; obj && i < len
				; ) {
				key = path[i++]
				if (_set) {
					if (i == len) {
						// Reuse _set to keep existing value
						_set = obj[key]
						obj[key] = value
						return _set
					}
					if (!obj[key] || typeof obj[key] != "object") {
						obj[key] = {}
					}
				}
				obj = obj[key]
			}
		}
		return obj
	}

	/**
	 * JSON Merge Patch
	 * @see https://tools.ietf.org/html/rfc7396
	 */

	function mergePatch(target, patch, changed, previous, pointer) {
		var undef, key, oldVal, val, len, nextPointer
		if (isObject(patch)) {
			if (!pointer) {
				pointer = ""
			}
			if (!isObject(target)) {
				target = {}
			}
			for (key in patch) if (
				undef !== (oldVal = target[key], val = patch[key]) &&
				hasOwn.call(patch, key) &&
				(
					undef == val ?
					undef !== oldVal && delete target[key] :
					target[key] !== val
				)
			) {
				nextPointer = pointer + "/" + key.replace(/~/g, "~0").replace(/\//g, "~1")
				len = changed && isObject(target[key]) && changed.length
				if (undef != val) {
					target[key] = mergePatch(target[key], val, changed, previous, nextPointer)
				}
				if (len === false || changed && len != changed.length) {
					changed.push(nextPointer)
					if (previous && !isObject(oldVal)) {
						previous[nextPointer] = oldVal
					}
				}
			}
		} else {
			if (changed && isObject(target)) {
				val = {}
				for (key in target) if (hasOwn.call(target, key)) {
					val[key] = null
				}
				mergePatch(target, val, changed, previous, pointer)
			}
			target = patch
		}
		return target
	}

	function merge(target) {
		for (var key, source, a = arguments, i = 1, len = a.length; i < len; ) {
			if (source = a[i++]) for (key in source) if (hasOwn.call(source, key)) {
				target[key] = source[key]
			}
		}
		return target
	}

	function clone(obj) {
		var temp, key
		if (obj && typeof obj == "object") {
			// new Date().constructor() returns a string
			temp = obj instanceof Date ? new Date(+obj) :
				// obj instanceof RegExp ? new RegExp(obj.source, (obj.ignoreCase ? "i" : "") + (obj.global ? "g" : "") + (obj.multiline ? "m" : "")) :
				obj.constructor()
			for (key in obj) if (hasOwn.call(obj, key)) {
				temp[key] = clone(obj[key])
			}
			obj = temp
		}
		return obj
	}

	function isObject(obj) {
		return !!obj && obj.constructor === Object
	}

// `this` refers to the `window` in browser and to the `exports` in Node.js.
}(this.JSON || this)


