

/*! litejs.com/MIT-LICENSE.txt */

module.exports = function(choices, priority) {
	var group = 0
	, ruleSeq = 0
	, rules = choices.constructor == Object ? Object.keys(choices) : choices
	, escapeRe = /[.+?^!:${}()|\[\]\/\\]/g
	, fnStr = 'return function(i){for(var m,t,l={q:null};(m=r.exec(i))&&(m='

	return Function(
		'c,R',
		'var r=/(?:^|,\\s*)(?:(' +
		('' + rules).replace(/[^,;]+|\s*;\s*(\w+)=("([^"]*)"|[^,;\s]*)|,/ig, function add(rule, key, token, qstr, offset) {
			if (key) {
				fnStr += ',' + key + ':unescape(m[' + (++group + 1) + ']==null?m[' + (group++) + ']||"' + escape(qstr == null ? token : qstr ) + '":m[' + group + '])'
				return '(?=(?:"[^"]*"|[^,])*;\\s*' + key + '(?:=|\\*=utf-8\'\\w*\')("([^"]*)"|[^\\s,;]+)|)'
			}
			if (rule == ',') {
				return ')|('
			}
			fnStr += (offset ? '}:m[' : 'm[') + (++group) + ']?{rule:"' + rule + '",match:m[' + group + ']'
			if (choices !== rules) {
				fnStr += ',o:c[R[' + (ruleSeq++) + ']]'
			}

			key = rule.match(/^(.+?)\/(.+?)(?:\+(.+))?$/)
			rule = rule.replace(escapeRe, '\\$&')
			if (key) {
				// type / [ tree. ] subtype [ +suffix ] [ ; parameters ]
				fnStr += ',type:' + capture(1, /(.*)\\\//, '($1)\\/')
				+ ',subtype:' + capture(2, /\/(.+?)(?=\\\+|$)/, '/($1)')
				+ ',suffix:' + capture(3, /\+(.+)/, '+($1)')
			}
			rule = rule.replace(/\*/g, '[^,;\\s\\/+]+?')

			return (offset ? rule : '(?:' + rule + '|[*\\/]+)') + add(0, 'q', 1)

			function capture(j, re, to) {
				return /\*/.test(key[j]) ?
				((rule = rule.replace(re, to)), 'm[' + (++group) + ']') :
				'"' + (key[j] || '') + '"'
			}
		}) +
		'))\\s*(?=,|;|$)(?:"[^"]*"|[^,])*/gi;' +
		fnStr.replace(/m\[\d+\]\?(?!.*m\[\d+\]\?)/, '') +
		'});){t=1*m.q;if((m.q=t>=0&&t<1?t:1)>l.q' +
		(priority || '') +
		')l=m}return l}'
	)(choices, rules)
}

