
this.parse = function(str) {
	var map = {}
	if (typeof str === "string" && str !== "") {
		var junks
		, arr = str.split("&")
		, i = 0
		, len = arr.length
		for (; i < len; ) {
			junks = arr[i++].replace(/\+/g, " ").split("=")
			key = unescape(junks[0])
			val = unescape(junks[1] || "")
			if (Array.isArray(map[key])) {
				map[key].push(val)
			} else {
				map[key] = (
					typeof map[key] === "undefined" ?
					val :
					[map[key], val]
				)
			}
		}
	}
	return map
}

