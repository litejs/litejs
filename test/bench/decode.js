

function decodeQ1(str) {
	return str
	.replace(/_/g, " ")
	.replace(/=([a-f\d]{2})/gi, function(_, code) {
		return String.fromCharCode(parseInt(code, 16))
	})
}
function decodeQ2(str) {
	// https://tools.ietf.org/html/rfc2047
	return unescape(
		str
		.replace(/_/g, " ")
		.replace(/%/g, "%25")
		.replace(/\=(?=[\da-f]{2})/gi, "%")
	)
}

/*
var encodedWordRe = /=\?([^\?]+?)\?(Q|B)\?([^\?]*?)\?=/gi
function decode(str) {
	return str.replace(encodedWordRe, function(_, charset, enc, txt) {
		return (
			enc === "Q" || enc === "q" ?
			decodeQ2(txt) :
			Buffer.from(txt, "base64").toString()
		)
	})
}

function encode(str) {
	return "=?utf-8?Q?" + encodeURIComponent(token.replace(/ /g, "_")).replace(/%/g, "=") + "?="
}
*/


module.exports = {
	"decodeQ1": function() {
		decodeQ1("=C2=A1Hola=2C_se=C3=B1or!")
	},
	"decodeQ2": function() {
		decodeQ2("=C2=A1Hola=2C_se=C3=B1or!")
	}
}

