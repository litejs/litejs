
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

	require("./json")
	var re = /"((?:""|[^"])*)"|[^",\n\r]+|,|\r?\n/g

	function encode(obj, _opts) {
		var opts = _opts || {}
		, re = opts.re || /[",\r\n]/
		, escRe = opts.esc || /"/g
		, escVal = opts.escVal || "\"\""
		, arr = Array.isArray(obj) ? obj : [ obj ]
		, keys = opts.select ? opts.select.replace(/\[[^\]]+?\]/g, "").split(",") : Object.keys(arr[0])

		arr = arr.map(function(obj) {
			return keys.map(function(key) {
				var value = JSON.get(obj, key)
				if (Array.isArray(value)) value = value.join(";")
				return (
					value == null ? opts.NULL : // jshint ignore:line
					re.test(value += "") ? "\"" + value.replace(escRe, escVal) + "\"" :
					value
				)
			}).join(opts.delimiter)
		})
		if (opts.header === "present") {
			arr.unshift((opts.fields ? opts.fields.split(",") : keys).join(opts.delimiter))
		}
		return (opts.prefix || "") + arr.join(opts.br) + (opts.postfix || "")
	}

	function decode(str, _opts) {
		var m
		, opts = _opts || {}
		, row = []
		, head = row
		, arr = []
		, i = 0

		if (opts.header !== "present") {
			head = opts.fields ? opts.fields.split(",") : null
			row = arr[0] = head === null ? [] : {}
		}

		for (; (m = re.exec(str)); ) {
			if (m[0] === "\n" || m[0] === "\r\n") {
				arr.push(row = head === null ? [] : {})
				i = 0
			} else if (m[0] === ",") {
				i++
			} else {
				row[
					head !== null && head !== row ? head[i] : i
				] = typeof m[1] === "string" ? m[1].replace(/""/g, "\"") : m[0]
			}
		}
		if (i === 0) arr.length -= 1

		return arr
	}
}(this) // jshint ignore:line


