
/* globals console,module,process */
/* jshint -W097 */

"use strict";

var enableRe
, currentLevel = 2
, namespaces = log.namespaces = {}
, slice = [].slice
, date = new Date()
, green = "\x1b[32m"
, reset = "\x1b[0m"

log.levels = {
	"error": 0,
	"warn":  1,
	"info":  2,
	"debug": 3
}

module.exports = log

log.debug = debug
log.level = level
// expose nop for testing purpose
log.nop = function nop() {}
log.format = format

log.rawStream = null
log.prettyStream = process.stdout
log.errorStream = process.stderr



function log(name, enable) {
	var binded = namespaces[name] || (namespaces[name] = function log() {
		if (log.enabled === true) log.debug.apply(log, arguments)
	})
	binded.enabled = typeof enable === "boolean" ? enable : !!(enableRe && enableRe.test(name))
	setLevels(name)
	return binded
}

function level(newLevel) {
	if (newLevel >= 0 && newLevel < Object.keys(log.levels).length) {
		currentLevel = newLevel | 0
	}
	Object.keys(namespaces).forEach(setLevels)
	return currentLevel
}

function setLevels(name) {
	var level
	, levels = log.levels
	, binded = namespaces[name]
	for (level in levels) {
		binded[level] = (
			binded.enabled || levels[level] <= currentLevel ?
			Log.bind(binded, name, level) :
			log.nop
		)
	}
}

function Log(name, level, msg) {
	var args = arguments.length > 3 ? slice.call(arguments, 3) : null
	, now = date.setTime(Date.now())
	, tmp = now - (this.last || now)
	, out = date.toISOString() + " " + name

	if (log.rawStream) {
		log.rawStream.write([now, name, level, msg, args])
	}

	if (msg instanceof Error) {
		if (log.errorStream) {
			log.errorStream.write(
				date.toISOString() + " " + name + " " + msg.stack + "\n"
			)
			msg = msg.message
		} else {
			msg = msg.stack || msg.message
		}
	}

	out += " " + (args === null ? msg : format(msg, args)) + green + " +" + (
		tmp > 36e4 ? (tmp / 36e4).toFixed(1) + "h" :
		tmp > 6e4  ? (tmp / 6e4).toFixed(1) + "m" :
		tmp > 1e3  ? (tmp / 1e3 | 0) + "s" :
		tmp + "ms"
	).replace(".0", "") + reset

	if (log.prettyStream) {
		log.prettyStream.write(out + "\n")
	} else {
		console.log(out)
	}

	this.last = now
}

function debug(filter) {

	enableRe = filter && RegExp( // jshint ignore:line
		"^(" +
		filter
		.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*?")
		.replace(/[\s,]+/g, "|") +
		")$"
	)
	Object.keys(namespaces).forEach(log)
}

function format(msg, args) {
	var tmp
	, out = ""
	, i = 0
	, last = 0
	, replaced = 0
	, msgi = msg.length - 1
	, argi = args.length

	for (; i < msgi && replaced < argi; ) {
		// 37=%  115=s  102=f  100=d  105=i  111=o
		if (msg.charCodeAt(i++) === 37) {
			tmp = msg.charCodeAt(i)
			if (tmp === 115 || tmp === 100 || tmp === 102) {
				out += msg.slice(last, i - 1) + args[replaced++]
				last = ++i
			} else if (tmp === 105) {
				out += msg.slice(last, i - 1) + (args[replaced++]|0)
				last = ++i
			} else if (tmp === 111) {
				out += msg.slice(last, i - 1) + JSON.stringify(args[replaced++])
				last = ++i
			} else if (tmp === 37) {
				out += msg.slice(last, i)
				last = ++i
			}
		}
	}
	if (last <= msgi) {
		out += msg.slice(last)
	}

	if (replaced < argi) {
		for (; replaced < argi; ) {
			out += " " + args[replaced++]
		}
	}
	return out
}




