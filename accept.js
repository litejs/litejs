//, tokenRe = /[\w!#$%&'*+-.^`|~]/

module.exports = accept

function accept(choices) {
	var reStr = "var r=/(?:^|,\\s*)(?:("
	, fnStr = "for(var m,n={};(m=r.exec(i))&&(m="
	, seq = 0
	, escapeRe = /[.+?^!:${}()|\[\]\/\\]/g
	, wildRe = /\*/

	reStr += ("" + choices).replace(/[^,;]+|\s*;\s*(\w+)=("([^"]*)"|[^,;\s]+)|,/ig, function a(rule, key, token, qstr, offset) {
		if (key) {
			fnStr += ',' + key + ':unescape(m[' + (++seq + 1) + ']||m[' + (seq++) + ']||"' + escape(qstr == null ? token : qstr ) + '")'
			return '(?=(?:"[^"]*"|[^,])*;\\s*' + key + '=("([^"]*)"|[^\\s,;]+)|)'
		}
		if (rule === ",") {
			return ")|("
		}
		fnStr += (offset ? "}:m[" : "m[") + (++seq) + ']?{rule:"' + rule + '"'
		fnStr += ",match:m[" + seq + "]"

		var junks = rule.split(/\/|\+/)
		rule = rule.replace(escapeRe, "\\$&")
		// tag
		if (junks[1]) {
			// type / [ tree. ] subtype [ +suffix ] [ ; parameters ]
			/*
			fnStr += ",type:m[" + (++seq) + "]"
			fnStr += ",subtype:m[" + (++seq) + "]"
			fnStr += ",suffix:" + (junks[2] ? "m[" + (++seq) + "]" : '""')
			rule = "(" + rule.replace(/\\[\/+]/g, ")$&(") + ")"
			/*/
			fnStr += ",type:" +    (wildRe.test(junks[0])&&(rule = "(" + rule.replace("\\/", ")$&")) ? "m[" + (++seq) + "]" : '"' + junks[0] + '"')
			fnStr += ",subtype:" + (wildRe.test(junks[1])&&(rule = rule.replace(/\/(.+?)(?=\\\+|$)/, "/($1)")) ? "m[" + (++seq) + "]" : '"' + junks[1] + '"')
			fnStr += ",suffix:" +  (wildRe.test(junks[2])&&(rule = rule.replace("\\+(.+)", "\\+($1)")) ? "m[" + (++seq) + "]" : '"' + (junks[2] || "") + '"')
			//*/
		}
		rule = rule.replace(/\*/g, "[^,;\\s]+?")

		return (offset ? rule : "(?:" + rule + "|[*\\/]+)") + a(0,"q","1")
	}) + '))\\s*(?=,|;|$)(?:"[^"]*"|[^,])*/gi;'

	/*
	console.log("reStr", reStr)
	console.log("fnStr", fnStr)
	//*/

	return Function(
		reStr +
		"return function(i){" + fnStr.replace(/m\[\d+\]\?(?!.*m\[\d+\]\?)/, "") +
		"});){m.q=parseFloat(m.q)||1;if(!n.q||m.q>n.q||m.q==n.q&&n.match.length>m.match.length)n=m}return n}"
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
// media-type = type "/" subtype *( OWS ";" OWS parameter )
// type       = token
// subtype    = token
//
// The type/subtype MAY be followed by parameters in the form of name=value pairs.
// parameter      = token "=" ( token / quoted-string )
// The type, subtype, and parameter name tokens are case-insensitive.
//
// \w = [A-Za-z0-9_]
// token = !#$%&'*+-.^_`|~
// DIGIT / ALPHA
//
// Most HTTP header field values are defined using common syntax
// components (token, quoted-string, and comment) separated by
// whitespace or specific delimiting characters.  Delimiters are chosen
// from the set of US-ASCII visual characters not allowed in a token
// (DQUOTE and "(),/:;<=>?@[\]{}").

//   token          = 1*tchar

//   tchar          = "!" / "#" / "$" / "%" / "&" / "'" / "*"
//                  / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
//                  / DIGIT / ALPHA
//                  ; any VCHAR, except delimiters

// A string of text is parsed as a single value if it is quoted using
// double-quote marks.

//   quoted-string  = DQUOTE *( qdtext / quoted-pair ) DQUOTE
//   qdtext         = HTAB / SP /%x21 / %x23-5B / %x5D-7E / obs-text
//   obs-text       = %x80-FF

// Comments can be included in some HTTP header fields by surrounding
// the comment text with parentheses.  Comments are only allowed in
// fields containing "comment" as part of their field value definition.

//   comment        = "(" *( ctext / quoted-pair / comment ) ")"
//   ctext          = HTAB / SP / %x21-27 / %x2A-5B / %x5D-7E / obs-text

// The backslash octet ("\") can be used as a single-octet quoting
// mechanism within quoted-string and comment constructs.  Recipients
// that process the value of a quoted-string MUST handle a quoted-pair
// as if it were replaced by the octet following the backslash.

//   quoted-pair    = "\" ( HTAB / SP / VCHAR / obs-text )

// A sender SHOULD NOT generate a quoted-pair in a quoted-string except
// where necessary to quote DQUOTE and backslash octets occurring within
// that string.  A sender SHOULD NOT generate a quoted-pair in a comment
// except where necessary to quote parentheses ["(" and ")"] and
// backslash octets occurring within that comment.


