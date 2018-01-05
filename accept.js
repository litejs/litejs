
module.exports = accept

function accept(choices) {
	var reStr = ""
	, fnStr = ""
	, seq = 0
	, escapeRe = /[.*+?^=!:${}()|\[\]\/\\]/g
	, extRe = /\/(?:[^,;]+?\+)?|[,;\s]+/

	choices.forEach(function(choice) {
		if (typeof choice === "string") {
			choice = { accept: choice }
		}
		var _re = choice.accept.replace(escapeRe, "\\$&")
		, _fn = "u[" + (++seq) + "]?("
		, match = choice.match || choice.accept.split(extRe)[1]

		match = match ? '"' + match + '"' : "u[" + seq + "]"

		if (choice.accept.indexOf("/") > -1) {
			_re = "(" + _re.replace(/\\\//, ")$&(") + ")"
			_fn += "o.type=u[" + (++seq) + "],o.subtype=u[" + (++seq) + "],"
		}
		_re = _re.replace(/\\\*/g, "[^,;\\/\\s]+")

		if (choice.params) {
			Object.keys(choice.params).forEach(function(param) {
				var def = escape(choice.params[param]).replace(/%u/g, "\\u").replace(/%/g, "\\x")
				_re += "(?=[^,]*;\\s*" + param + '\\=(?:(\\w+)|"([^"]*)")|)'
				_fn += "o['" + param + "']=u[" + (++seq) + "]||u[" + (++seq) + "]||'" + def + "',"
			})
		}

		fnStr += _fn + match + "):"
		reStr += (reStr ? "|(" : "(") + _re + ")"
	})

	return Function(
		"var r=/(?:^|,\\s*)(?:" + reStr + ")(?:,|;|$)/i;" +
		"return function(i){var u=r.exec(i),o={};o.match=u?(" + fnStr + "u):u;return o}"
	)()
}

// The HTTP/1.1 standard defines list of the standard headers that start server-driven negotiation:
//  - Accept, Accept-Charset, Accept-Encoding, Accept-Language
//
// Accept: text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8
// Accept-Charset: utf-8, iso-8859-1;q=0.5
// Accept-Encoding: deflate, gzip;q=1.0, *;q=0.5
// Accept-Language: fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5
//
// \w = [A-Za-z0-9_]
// token = !#$%&'*+-.^_`|~
// DIGIT / ALPHA

