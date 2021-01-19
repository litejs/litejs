


!function(exports, Object) {
	"use strict";
	var getFns = Object.create(null)
	, setFns = Object.create(null)
	, filterFns = Object.create(null)
	, KEYS = Object.keys
	, FILTER_ERR = "Invalid filter: "
	, escRe = /['\n\r\u2028\u2029]|\\(?!x2e)/g
	, pathRe = /(^$|.+?)(?:\[([^\]]*)\]|\{([^}]*)})?(\.(?=[^.])|$)/g
	, reEscRe = /[.+^=:${}()|\/\\]/g
	, keyRe = /\[(.*?)\]/g
	, globRe = /\[.+?\]|[?*]/
	, globReplace = /\?|(?=\*)/g
	, globGroup = /\[!(?=.*\])/g
	, primitiveRe = /^(-?(\d*\.)?\d+|true|false|null)$/
	, valRe = /("|')(?:\\?[^\\])*?\1|(\w*)\{((?:("|')(?:\\?[^\\])*?\4|\w*\{(?:("|')(?:\\?[^\\])*?\5|[^}])*?\}|.)*?)\}|([@$]?)([^,]+)/g
	, filterRe = /(!?)(\$?)((?:[-+:.\/\w]+|\[[^\]]+\]|\{[^}]+}|\\x2e)+)(\[]|\{}|)(?:(!(?=\1)==?|(?=\1)[<>=]=?)((?:("|')(?:\\?[^\\])*?\7|\w*\{(?:("|')(?:\\?[^\\])*?\8|\w*\{(?:("|')(?:\\?[^\\])*?\9|[^}])*?\}|.)*?\}|[^|&()])*))?(?=[;)|&]|$)|(([;&|])\11*|([()])|.)/g
	, onlyFilterRe = RegExp("^(?:([@*])|" + filterRe.source.slice(0, -10) + "))+$")
	, cleanRe = /(\(o=d\)&&(?!.*o=o).*)\(o=d\)&&/g
	, fns = {
		"==": "a==d",
		"===": "a===d",
		">": "a<d",
		">=": "a<=d",
		"<": "a>d",
		"<=": "a>=d",
		"~": "typeof d==='string'&&a.test(d)"
	}
	, fnMap = {
		w: "Day()||7",
		Y: "FullYear()%100",
		M: "Month()+1",
		D: "Date()",
		h: "Hours()",
		H: "Hours()%12||12",
		m: "Minutes()",
		s: "Seconds()",
		S: "Milliseconds()"
	}
	, hasOwn = fns.hasOwnProperty
	, tmpDate = new Date()
	, isArray = Array.isArray

	exports.clone = clone
	exports.matcher = matcher
	exports.get = function(obj, pointer, fallback) { return pathFn(pointer)(obj, fallback) }
	exports.isObject = isObject
	exports.mergePatch = mergePatch
	exports.set = function(obj, pointer, value) { return pathFn(pointer, true)(obj, value) }
	exports.setForm = setForm
	exports.tr = tr

	exports.get.str = pathStr
	matcher.re = filterRe
	matcher.str = filterStr
	matcher.valRe = valRe

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

	function escFn(str) {
		return escape(str).replace(/%u/g, "\\u").replace(/%/g, "\\x")
	}

	function pathStr(str, set) {
		return (
			str.charAt(0) === "/" ?
			str.slice(1).replace(/\./g, "\\x2e").replace(/\//g, ".").replace(/~1/g, "/").replace(/~0/g, "~") :
			str
		)
		.replace(escRe, escFn)
		.replace(pathRe, set === true ? pathSet : pathGet)
	}

	function pathGet(str, path, arr, obj, dot) {
		var v = dot ? "(o=" : "(c="
		, sub = arr || obj
		if (sub && !(sub = onlyFilterRe.exec(sub))) throw Error(FILTER_ERR + str)
		return (
			sub ?
			pathGet(0, path, 0, 0, 1) + (arr ? "i" : "j") + "(o)&&" + v + (
				sub[1] ? (arr ? "o" : "K(o)") + (sub[0] === "*" ? "" : ".length") :
				+arr == arr ?  "o[" + (arr < 0 ? "o.length" + arr : arr) + "]" :
				(arr ? "I" : "J") + "(o,f('" + sub[0] + "'))"
			) + ")" :
			v + "o['" + path + (
				arr === "" ? "'])&&i(c)&&c" :
				obj === "" ? "'])&&j(c)&&c" :
				"'])"
			)
		) + (dot ? "&&" : "")
	}

	function pathSet(str, path, arr, obj, dot) {
		var op = "o['" + path + "']"
		, out = ""
		, sub = arr || obj
		if (sub) {
			out = "(o="+(arr?"i":"j")+"(o['" + path + "'])?o['" + path + "']:(o['" + path + "']="+(arr?"[]":"{}")+"))&&"
			if (arr === "-") {
				op = "o[o.length]"
			} else if (+arr == arr) {
				op = "o[" + (arr < 0 ? "o.length" + arr : arr) + "]"
			} else {
				if (!onlyFilterRe.test(arr)) throw Error(FILTER_ERR + str)
				op = "o[t]"
				out += "(t="+(arr?"I":"J")+"(o,f('" + sub + "'),1))!=null&&"
			}
		}
		return out + (dot ?
			"(o=typeof " + op + "==='object'&&" + op + "||(" + op + "={}))&&" :
			"((c=" + op + "),(" + op + "=v),c)"
		)
	}

	function pathFn(str, set) {
		var map = set === true ? setFns : getFns
		return map[str] || (map[str] = Function(
			"i,j,I,J,K,f",
			"return function(d,v,b){var c,o,t;return (o=d)&&" +
			pathStr(str, set) +
			(set ? ",c}": "!==void 0?c:v}")
		)(isArray, isObject, inArray, inObject, KEYS, matcher))
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

	function matcher(str, prefix, opts, getter, tmp) {
		var optimized
		, arr = []
		, key = (prefix || "") + (fns[str] || filterStr(str, opts, arr, getter))
		, fn = filterFns[key]
		if (!fn) {
			for (optimized = key; optimized != (optimized = optimized.replace(cleanRe, "$1")); );
			fn = filterFns[key] = Function(
				fns[str] ? "a" : "a,i,j,I,J,K,f,p,t",
				"return function(d,b){var o;return " + optimized + "}"
			)
			fn.source = optimized
		}
		return fns[str] ? fn : fn(
			arr, isArray, isObject, inArray, inObject, KEYS, matcher, pathFn, tmp
		)
	}

	// Date{day=1,2}
	// sliceable[start:stop:step]
	// Geo{distance=200km&lat=40&lon=-70}
	// ?pos=Geo{distance=200km&lat=@lat&lon=@lon}
	// [lon, lat] in The GeoJSON Format RFC 7946
	// IP{net=127.0.0.1/30}
	// var re = /^((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])(?:\.(?=.)|$)){4}$/
	// ["1.2.3.4", "127.0.0.1", "192.175.255.254."].map(re.test, re)

	matcher.date = function(str) {
		return matcher(str, "(t.setTime(+d)>=0)&&", null, dateGetter, tmpDate)
	}

	function dateGetter(name) {
		return "(t.get" + fnMap[name] + ")"
	}

	function filterStr(qs, opts, arr, getter) {
		return qs.replace(filterRe, worker).replace(/^[1&]&+|&+1?$/g, "") || "1"

		function worker(all, not, isOption, attr, isArray, op, val, q1, q2, q3, ext, ok2, ok1) {
			if (ext) {
				if (!ok2 && !ok1) {
					throw Error(FILTER_ERR + qs)
				}
				return ok1 ? ok1 : ok2 == ";" ? "&&" : ok2 + ok2
			}
			if (isOption) {
				if (opts) opts[attr] = val
				return "1"
			}

			var idd, m, v, isRe
			, a = []
			, pre = "(o=d)&&"

			attr = (getter || pathStr)(attr)

			if (m = attr.match(/\(c=(.*?)\)$/)) {
				if (m[1] == "K(o)") {
					pre += attr + "&&"
					attr = "c"
				} else {
					if (m.index) pre += attr.slice(0, m.index)
					attr = m[1]
				}
			}

			if (op == "!=" || op == "!==") {
				not = "!"
				op = op.slice(1)
			}
			if (isArray) {
				pre += not + (isArray === "[]" ? "i(" : "j(") + attr + ")"
			}

			if (!op) {
				return isArray === "" ? pre + not + attr : pre
			}

			if (op == "=" || op == "==") op += "="
			if (val === "") val="''"
			for (; m = valRe.exec(val); ) {
				// quote, extension, subquery, subQuote, subSubQuote, at
				// Parameterized query ?name=$name|name=:name
				isRe = 0
				v = m[6] == "$" ? "b['"+ m[7] +"']" : arrIdx(arr,
					m[1] || m[3] ? m[0].slice(m[3] ? m[2].length + 1 : 1, -1) :
					m[6] ? m[7] :
					primitiveRe.test(m[0]) ? JSON.parse(m[0]) :
					(isRe = globRe.test(m[0])) ? RegExp(
						"^" + m[0]
						.replace(reEscRe, "\\$&")
						.replace(globReplace, ".")
						.replace(globGroup, "[^") + "$",
						op === "==" ? "i" : ""
					) :
					m[0]
				)
				idd = (
					m[2] ? "f." + m[2].toLowerCase() :
					m[3] ? "f" :
					isArray || attr === "c" ? arrIdx(arr, matcher(isRe ? "~" : op)) :
					""
				) + "(" + v
				a.push(
					isArray || attr === "c" ? (isArray == "{}" ? "J(" : "I(") + attr + "," + idd + "))" :
					m[2] || m[3] ? idd + ")(" + attr + ")" :
					isRe ? "typeof " + attr + "==='string'&&" + v + ".test(" + attr + ")" :
					m[6] ? attr + "!==void 0&&" + attr + op + (
						m[6] == "$" ? "b['"+ m[7] +"']" : "p(" + v + ")(o)"
					) :
					attr + op + v
				)
			}

			return pre + (
				isArray ? (not ? "||" : "&&") : ""
			) + not + "(" + a.join("||") + ")"
		}
	}

	function arrIdx(arr, val) {
		for (
			var i = arr.length;
			0 <= --i && !(
				arr[i] === val ||
				val && val.source && val.source === arr[i].source
			);
		);
		return "a[" + (-1 < i ? i : arr.push(val) - 1) + "]"
	}

	function setForm(map, key_, val) {
		for (var match, key = key_, step = map; match = keyRe.exec(key_); ) {
			if (step === map) key = key.slice(0, match.index)
			match = match[1]
			step = step[key] || (
				step[key] = match && +match != match ? {} : []
			)
			key = match
		}
		if (isArray(step)) {
			step.push(val)
		} else if (isArray(step[key])) {
			step[key].push(val)
		} else {
			step[key] = step[key] != null ? [step[key], val] : val
		}
	}

	function tr(attrs, aclFn) {
		var attr, tmp
		, arr = []
		, map = {}
		, i = 0
		for (; attr = valRe.exec(attrs); ) {
			tmp = attr[0].split(":")
			exports.set(map, tmp[0], i)
			arr[i++] = pathFn(tmp[1] ? attr[0].slice(tmp[0].length+1) : tmp[0])
		}
		return Function(
			"g,a",
			"return function(o,a){return " +
			JSON.stringify(map).replace(/:(\d+)/g,":g[$1](o)") + "}"
		)(arr, aclFn)
	}

	function isObject(obj) {
		return !!obj && obj.constructor === Object
	}

	function inArray(a, fn, idx) {
		for (var i = -1, len = a.length; ++i < len; ) {
			if (fn(a[i])) return idx == null ? a[i] : i
		}
		return idx != null && len
	}

	function inObject(o, fn, idx) {
		for (var key in o) {
			if (fn(o[key])) return idx == null ? o[key] : key
		}
		return null
	}
// `this` refers to the `window` in browser and to the `exports` in Node.js.
}(JSON, Object)


