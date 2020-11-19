
this.parse = function(str) {
	var step, map = {}
	if (typeof str === "string" && str !== "") {
		var arr = str.split("&")
		, i = 0
		, l = arr.length
		for (; i < l; ) {
			step = arr[i++].replace(/\+/g, " ").split("=")
			key = unescape(step[0])
			val = unescape(step[1] || "")
			step = map
			key.replace(/\[(.*?)\]/g, function(_, _key, offset) {
				if (step === map) key = key.slice(0, offset)
				step = step[key] || (
					step[key] = step[key] === null || _key && +_key != _key ? {} : []
				)
				key = _key
			})
			if (Array.isArray(step)) {
				step.push(val)
			} else if (Array.isArray(step[key])) {
				step[key].push(val)
			} else {
				step[key] = step[key] != null ? [step[key], val] : val
			}
		}
	}
	return map
}

