

require("litejs/test").describe.it("should handle logs", function(assert, mock) {
	var tmp
	, log = require("../log")
	, a = log("main:a")
	, b = log("main:b", true)
	, c = log("other:c", true)
	, rawWrite = mock.fn()
	, prettyWrite = mock.fn()
	, errorWrite = mock.fn()
	, err1 = Error("log 3")
	, err2 = Error("log 4")

	mock.time("2018-06-03T09:41:08.698Z")
	mock.replace(console, "log", mock.fn())
	mock.replace(Array.prototype, "pluck", function(name) {
		for (var arr = this, i = arr.length, out = []; i--; ) {
			out[i] = arr[i][name]
		}
		return out
	})

	log.prettyStream = null
	log.errorStream = null

	err2.stack = null
	err2.message = "Error: log 4"

	assert.equal(a.enabled, false)
	assert.equal(b.enabled, true)
	assert.equal(c.enabled, true)
	log.level()
	assert.equal(a.enabled, false)
	assert.equal(b.enabled, true)
	assert.equal(c.enabled, true)

	assert.equal(rawWrite.called, 0)
	a("log 1", "rows")
	a.debug("log 1", "rows")
	a.error("log 1", "rows")
	a.info("log 1", "rows")
	a.warn("log 1", "rows")
	c("log 3")
	assert.equal(rawWrite.called, 0)

	log.rawStream = {
		write: rawWrite
	}
	log.prettyStream = {
		write: prettyWrite
	}
	a("log 1")
	b(err1)
	b(err2)

	log.errorStream = {
		write: errorWrite
	}

	mock.tick(1)
	c(err2, "x")
	assert.equal(prettyWrite.called, 3)
	assert.equal(rawWrite.called, 3)

	mock.tick(1499)
	b("log 2")
	mock.tick(61500)
	b("log 2", "2")
	mock.tick(3601500)
	b("log 222")
	assert.equal(prettyWrite.called, 6)
	tmp = prettyWrite.calls.pluck("args").pluck("0")
	assert.equal(tmp[0], "2018-06-03T09:41:08.698Z main:b +0ms " + err1.stack + "\n")
	assert.equal(tmp[1], "2018-06-03T09:41:08.698Z main:b +0ms " + err2.message + "\n")
	assert.equal(tmp[2], "2018-06-03T09:41:08.699Z other:c +1ms " + err2.message + " x\n")
	assert.equal(tmp[3], "2018-06-03T09:41:10.198Z main:b +1s log 2\n")
	assert.equal(tmp[4], "2018-06-03T09:42:11.698Z main:b +1m log 2 2\n")
	assert.equal(tmp[5], "2018-06-03T10:42:13.198Z main:b +10h log 222\n")
	assert.equal(errorWrite.called, 1)
	assert.equal(errorWrite.calls.pluck("args").pluck("0"), [
		"2018-06-03T09:41:08.699Z other:c " + err2.stack + "\n"
	])

	assert.notEqual(a.error, log.nop)
	assert.notEqual(a.warn, log.nop)
	assert.notEqual(a.info, log.nop)
	assert.equal(a.debug, log.nop)

	assert.notEqual(b.error, log.nop)
	assert.notEqual(b.warn, log.nop)
	assert.notEqual(b.info, log.nop)
	assert.notEqual(b.debug, log.nop)

	log.level(1)

	assert.equal(a.enabled, false)
	assert.equal(b.enabled, true)
	assert.equal(c.enabled, true)

	assert.notEqual(a.error, log.nop)
	assert.notEqual(a.warn, log.nop)
	assert.equal(a.info, log.nop)
	assert.equal(a.debug, log.nop)

	assert.notEqual(b.error, log.nop)
	assert.notEqual(b.warn, log.nop)
	assert.notEqual(b.info, log.nop)
	assert.notEqual(b.debug, log.nop)

	log.debug("*")

	assert.equal(a.enabled, true)
	assert.equal(b.enabled, true)
	assert.equal(c.enabled, true)

	log.debug(null)

	assert.equal(a.enabled, false)
	assert.equal(b.enabled, false)
	assert.equal(c.enabled, false)

	log.debug("main:*")

	assert.equal(a.enabled, true)
	assert.equal(b.enabled, true)
	assert.equal(c.enabled, false)


	assert.equal(log.format("%s", ["A1"]), "A1")
	assert.equal(log.format("%x", ["A1"]), "%x A1")
	assert.equal(log.format(" %s", ["A2"]), " A2")
	assert.equal(log.format("%s ", ["A3"]), "A3 ")
	assert.equal(log.format(" %s ", ["A4"]), " A4 ")
	assert.equal(log.format("1a %s b %s c", ["A"]), "1a A b %s c")
	assert.equal(log.format("2a %s b %s c", ["A", "B"]), "2a A b B c")
	assert.equal(log.format("3a %s b %s c", ["A", "B", "C"]), "3a A b B c C")

	assert.equal(log.format("%i %%o %d %f %o o", [1.1, 1.1, 1.1, {a:1.1}]), '1 %o 1.1 1.1 {"a":1.1} o')

	assert.end()
})

