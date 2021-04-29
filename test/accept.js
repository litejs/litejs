//require("../polyfill")

var it = describe.it


describe("accept", function() {

	var accept = require("../accept").accept

	function handleLargeHeader(nego) {
		// Node maximum header size is 80KB, we test against 95KB
		var str = new Array(5000).join(", ab/cde;header=absent")
		, start = process.hrtime()
		, res = nego(str)
		, end = process.hrtime(start)
		, ms = end[0] * 1000 + end[1] * 1e-6

		return ms < 100
	}


	it("should negotiate Accept", function(assert) {

		// TODO:2019-09-02:lauri:
		// RFC-2616 defined this:
		//     Words of *TEXT MAY contain characters from character sets other than ISO- 8859-1 [22]
		//     only when encoded according to the rules of RFC 2047 [14].
		//        =?UTF-8?Q?=E2=9C=B0?=
		// Parameter Value Continuations RFC-2231
		//     Content-Type: message/external-body; access-type=URL;
		//      URL*0="ftp://";
		//      URL*1="cs.utk.edu/pub/moore/bulk-mailer/bulk-mailer.tar"
		// is semantically identical to
		//     Content-Type: message/external-body; access-type=URL; URL="ftp://cs.utk.edu/pub/moore/bulk-mailer/bulk-mailer.tar"
		// Parse Parameters
		//
		// Non-extended notation, using "quoted-string" RFC-8187
		//     foo: bar; title="US-$ rates"
		// Extended notation, using the Unicode character U+00A3 ("£", POUND SIGN):
		//     foo: bar; title*=utf-8'en'%C2%A3%20rates


		var nego = accept([
			"*/json",
			"*/xhtml+*",
			"*/*+xml; a=",
			'text/csv;header=absent;delimiter=",";NULL="";br="\r\n"',
			"application/sql; table=table",
			"bar; title=",
			"*/*"
		])

		assert
		.equal(nego("a"), {q:null})
		.equal(nego("application/xml"), {
			match: "application/xml",
			q: 1,
			rule: "*/*",
			type: "application",
			subtype: "xml",
			suffix: ""
		})
		.equal(nego("application/xaml+xml"), {
			match: "application/xaml+xml",
			q: 1,
			rule: "*/*+xml",
			type: "application",
			subtype: "xaml",
			suffix: "xml",
			a: ""
		})
		.equal(nego("application/json"), {
			match: "application/json",
			q: 1,
			rule: "*/json",
			type: "application",
			subtype: "json",
			suffix: ""
		})
		.equal(nego("text/csv"), {
			match: "text/csv",
			q: 1,
			rule: "text/csv",
			type: "text",
			suffix: "",
			subtype: "csv",
			header: "absent",
			delimiter: ",",
			NULL: "",
			br: "\r\n"
		})
		.equal(nego("text/csv;header=present;delimiter=."), {
			match: "text/csv",
			q: 1,
			rule: "text/csv",
			type: "text",
			subtype: "csv",
			suffix: "",
			header: "present",
			delimiter: ".",
			NULL: "",
			br: "\r\n"
		})
		.equal(nego('text/csv ; delimiter=",;br=a" ; header=on.%;un=known;br="%0A"'), {
			match: "text/csv",
			q: 1,
			rule: "text/csv",
			type: "text",
			subtype: "csv",
			suffix: "",
			header: "on.%",
			delimiter: ",;br=a",
			NULL: "",
			br: "\n"
		})
		.equal(nego('text/csv ;delimiter=""'), {
			match: "text/csv",
			q: 1,
			rule: "text/csv",
			type: "text",
			suffix: "",
			subtype: "csv",
			header: "absent",
			delimiter: "",
			NULL: "",
			br: "\r\n"
		})
		.equal(nego("ab/cd;q=0.2, application/sql+xhtml, foo/xhtml+bar"), {
			match:"foo/xhtml+bar",
			q: 1,
			rule:"*/xhtml+*",
			type: "foo",
			subtype: "xhtml",
			suffix: "bar"
		})
		// Non-extended notation, using "quoted-string"
		.equal(nego('bar; title="US-$ rates"'), {
			rule: "bar",
			match: "bar",
			q:1,
			title: "US-$ rates"
		})
		// Extended notation, using the Unicode character U+00A3 ("£")
		.equal(nego("bar; title*=utf-8'en'%C2%A3%20rates"), {
			rule: "bar",
			match: "bar",
			q:1,
			title: "£ rates"
		})
		// Extended notation, using £ and €
		.equal(nego("bar; title*=UTF-8''%c2%a3%20and%20%e2%82%ac%20rates"), {
			rule: "bar",
			match: "bar",
			q:1,
			title: "£ and € rates"
		})
		// A parameter using the extended syntax takes precedence
		.equal(nego('bar; title="EURO exchange rates"; title*=utf-8\'\'%e2%82%ac%20exchange%20rates'), {
			rule: "bar",
			match: "bar",
			q:1,
			title: "€ exchange rates"
		})
		//.ok(handleLargeHeader(nego))

		var map = {
			'*/json;br="\r\n"': function cb1() {},
			"*/*": function() {}
		}
		, nego2 = accept(map)

		assert
		.equal(nego2("application/json"), {
			rule: "*/json",
			match: "application/json",
			o: map['*/json;br="\r\n"'],
			type: "application",
			subtype: "json",
			suffix: "",
			q: 1,
			br: "\r\n"
		})
		//.ok(handleLargeHeader(nego2))
		.end()
	})

	it("should negotiate Charset", function(assert) {
		var nego = accept("utf-8,iso-8859-15")

		assert
		.equal(nego("utf-8, iso-8859-1;q=0.5, *;q=0.1"), {
			rule: "utf-8",
			match: "utf-8",
			q: 1
		})
		.equal(nego("ISO-8859-15;q=0.5, *;q=0.1"), {
			rule: "iso-8859-15",
			match: "ISO-8859-15",
			q: 0.5
		})
		.equal(nego("iso,iso-123;q=0.5, *;q=0.1"), {
			rule: "utf-8",
			match: "*",
			q: 0.1
		})
		.ok(handleLargeHeader(nego))
		.end()
	})

	it("should negotiate Language", function(assert) {
		var nego1 = accept([ "de", "de-CH"])
		, nego2 = accept([ "de-CH", "de", "*" ])
		, nego3 = accept("en-US,en-GB", "lang")
		, nego4 = accept("en-US,en-GB,en", "lang")

		assert
		.equal(nego1("fr-CH, fr;q=0.9"), { q: null })
		.equal(nego1("fr-CH, de;q=0"), { q: null })
		.equal(nego1("fr-CH, de;q="), { rule: "de", q: 1, match: "de" })
		.equal(nego1("fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5"), {
			rule: "de",
			q: 0.7,
			match: "de"
		})
		.equal(nego1("en;q=0.8, de;q=0.7, de-CH;q=.9"), {
			rule: "de-CH",
			q: 0.9,
			match: "de-CH"
		})
		.equal(nego1("fr-CH, fr;q=0.9, en;q=0.8, *;q=0.5"), {
			rule: "de",
			q: 0.5,
			match: "*"
		})
		.equal(nego2("fr-CH, fr;q=0.9, en;q=0.8, *;q=0.5"), {
			rule: "*",
			match: "fr-CH",
			q: 1
		})
		.equal(nego2("en;q=0.8, fr;q=1.9, *;q=0.5"), {
			rule: "*",
			match: "fr",
			q: 1
		})
		.equal(nego3("en,en-US;q=0.8"), {
			rule: "en-GB",
			match: "en",
			q: 1
		})
		.equal(nego4("en,en-US;q=0.8"), {
			rule: "en",
			match: "en",
			q: 1
		})
		.end()
	})

	it("should negotiate Encoding", function(assert) {
		// gzip     - A compression format using the Lempel-Ziv coding (LZ77), with a 32-bit CRC.
		// compress - A compression format using the Lempel-Ziv-Welch (LZW) algorithm.
		// deflate  - A compression format using the zlib structure, with the deflate compression algorithm.
		// br       - A compression format using the Brotli algorithm.
		// identity - No compression, nor modification. This value is always considered as acceptable, even if not present.
		var list = [ "identity", "gzip", "compress", "deflate" ]
		, deflate = { rule: "deflate", match: "deflate", q:1 }
		, gzip    = { rule: "gzip", match: "gzip", q:1 }

		// By default first match is prefferred
		, nego1 = accept(list)

		// Alternatively a last match can be prefferred
		, nego2 = accept(list, '||m.q===l.q')

		// .. or a longer match can be prefferred
		, nego3 = accept(list, '||m.q===l.q&&l.match.length<m.match.length')

		// .. or a reversed alphabetical order can be used
		, nego4 = accept(list, '||m.q===l.q&&l.match<m.match')

		assert
		.equal(nego1("deflate, gzip, *;q=0.5"), deflate)
		.equal(nego1("gzip, deflate, *;q=0.5"), gzip)

		.equal(nego2("deflate, gzip, *;q=0.5"), gzip)
		.equal(nego2("gzip, deflate, *;q=0.5"), deflate)

		.equal(nego3("deflate, gzip, *;q=0.5"), deflate)
		.equal(nego3("gzip, deflate, *;q=0.5"), deflate)

		.equal(nego4("deflate, gzip, *;q=0.5"), gzip)
		.equal(nego4("gzip, deflate, *;q=0.5"), gzip)
		.end()
	})

	it("allows to define quality factor", function(assert) {
		var nego = accept("gzip;q=0.5,br,undefined,1")
		, nego1 = accept("")
		, nego2 = accept([])
		, nego3 = accept({})

		assert
		.equal(nego("gzip, br").match, "br")
		.equal(nego("br, gzip").match, "br")
		.equal(nego("gzip").match, "gzip")
		.equal(nego("br").match, "br")
		.equal(nego("gzip;q=0.8,br").match, "br")
		.notOk(nego().match)
		.notOk(nego(1).match)
		.notOk(nego("").match)
		.notOk(nego1("gzip").match)
		.notOk(nego1().match)
		.notOk(nego2("gzip").match)
		.notOk(nego3("gzip").match)
		.end()
	})

})



//, tokenRe = /[\w!#$%&'*+-.^`|~]/
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



