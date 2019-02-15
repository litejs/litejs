


!function(exports) {
	var pointerCache = {}
	, hasOwn = pointerCache.hasOwnProperty

	exports.clone = clone
	exports.mergePatch = mergePatch
	exports.isObject = isObject

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

	function clone(obj) {
		var temp, key
		if (obj && typeof obj == "object") {
			// new Date().constructor() returns a string
			temp = obj instanceof Date ? new Date(+obj) :
				obj instanceof RegExp ? RegExp(obj.source, (""+obj).split("/").pop()) :
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


