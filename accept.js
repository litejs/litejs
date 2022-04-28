

/*! litejs.com/MIT-LICENSE.txt */

this.accept = function(choices, priority) {
	// jshint quotmark:single, -W064
	'use strict'
	var group = 0
	, ruleSeq = 0
	, rules = choices.constructor === Object ? Object.keys(choices) : choices
	, escapeRe = /[.+?^!:${}()|[\]/\\]/g
	, fnStr = 'if(typeof i=="string")for(;(m=r.exec(i))&&(m='

	return Function(
		'c,R,D,u',
		'var r=/(?:^|,\\s*)(?:(' +
		('' + rules).replace(/[^,;]+|\s*;\s*(\w+)=("([^"]*)"|[^,;\s]*)|,/ig, function add(rule, key, token, qstr, offset, all) {
			if (key) {
				fnStr += ',' + key + ':D(m[' + (group += 3) + ']===u?m[' + (group - 1) + ']||' +
				JSON.stringify(qstr === void 0 ? token : qstr) + ':m[' + group + '])'
				return '(?=(?:"[^"]*"|[^,])*;\\s*' + key + '(=|\\*=utf-8\'\\w*\')("([^"]*)"|[^\\s,;]+)|)'
			}
			if (rule === ',') {
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
				fnStr += ',type:' + capture(1, /(.*)\\\//, '($1)\\/') +
				',subtype:' + capture(2, /\/(.+?)(?=\\\+|$)/, '/($1)') +
				',suffix:' + capture(3, /\+(.+)/, '+($1)')
			} else if ((key = priority === 'lang' && rule.match(/^..(?=-)/i))) {
				// Basic Filtering
				// https://tools.ietf.org/html/rfc4647#section-3.3.1
				if (!RegExp(key + '(?!-)', 'i').test(all)) {
					rule = '(?:' + rule + '|' + key + '(?!.+' + rule + '))'
				}
			}
			rule = rule.replace(/\*/g, '[^,;\\s\\/+]+?')

			return (offset ? rule : '(?:' + rule + '|[*\\/]+)') + add(0, 'q', 1)

			function capture(j, re, to) {
				return /\*/.test(key[j]) ?
					((rule = rule.replace(re, to)), 'm[' + (++group) + ']') :
					'"' + (key[j] || '') + '"'
			}
		}) +
		'))\\s*(?=,|;|$)(?:"[^"]*"|[^,])*/gi;return function(i){var m,t,l={q:null};' + (
			group ? fnStr.replace(/m\[\d+\]\?(?!.*m\[\d+\]\?)/, '') +
			'});){t=1*m.q;if((m.q=t>=0&&t<1?t:1)>l.q' +
			(priority && priority !== 'lang' ? priority : '') +
			')l=m}' : ''
		) + 'return l}'
	)(choices, rules, function(str) {
		try {
			return decodeURIComponent(str)
		} catch (e) {
			return str
		}
	})
}

