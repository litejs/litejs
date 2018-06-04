
/*
 * https://tools.ietf.org/html/rfc4180
 *
 * 6.  Fields containing line breaks (CRLF), double quotes, and commas
       should be enclosed in double-quotes.  For example:

       "aaa","b CRLF
       bb","ccc" CRLF
       zzz,yyy,xxx

   7.  If double-quotes are used to enclose fields, then a double-quote
       appearing inside a field must be escaped by preceding it with
       another double quote.  For example:

       "aaa","b""bb","ccc"
 */


!function(exports) {
	exports.encode = encode
	exports.decode = decode

	var Item = require("../model").Item
	, re = /"((?:""|[^"])*)"|[^",\n\r]+|\r?\n/g

	function encode(obj, opts) {
		var re = opts.re || /[",\r\n]/
		, arr = Array.isArray(obj) ? obj : [ obj ]
		, keys = opts.select ? opts.select.replace(/\[[^\]]+?\]/g, "").split(",") : Object.keys(arr[0])

		arr = arr.map(function(obj) {
			return keys.map(function(key) {
				var value = Item.get(obj, key)
				if (Array.isArray(value)) value = value.join(";")
				return (
					value == null ? opts.NULL :
					re.test(value+="") ? '"' + value.replace(/"/g, '""') + '"' :
					value
				)
			}).join(opts.delimiter)
		})
		if (opts.headers === "on") {
			arr.unshift(keys.join(opts.delimiter))
		}
		return (opts.prefix || "") + arr.join(opts.br) + (opts.postfix || "")
	}

	function decode(str, opts) {
		var match
		, lines = str.match(re)
		, row = []
		, arr = [row]

		for (; match = re.exec(str); ) {
			if (match[0] === "\n" || match[0] === "\r\n") {
				arr.push(row = [])
			} else {
				row.push(typeof match[1] === "string" ? match[1].replace(/""/g, '"') : match[0])
			}
		}

		return arr
	}
}(this)


