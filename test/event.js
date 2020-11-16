
global.document = this

var emitted = []
, expected = []
, events = require("../events")
, Emitter = events.Emitter
, emitter = new Emitter()
, em1 = new Emitter()
, em2 = new Emitter()
, scope1 = new Scope("scope1")
, scope2 = new Scope("scope2")
, ev1 = makeHandler("ev1")
, ev2 = makeHandler("ev2")
, ev3 = makeHandler("ev3")
, ev4 = makeHandler("ev4")
, em3 = new Emitter()
, ev3a = makeHandler("ev3a")
, ev3b = makeHandler("ev3b")
, ev3new = makeHandler("ev3new", emitter, ev3b)
, ev3remove = makeHandler("ev3remove", emitter, ev3b)

function makeHandler(name, scope, _origin) {
	return function(val) {
		emitted.push(name + ":" + val)
		if (scope) emitted.push(scope, _origin)
	}
}

function Scope(name) {
	this.name = name
}
Scope.prototype.handler = function(val) {
	emitted.push(this.name + " " + val)
}

require("litejs/test").describe.it ("should handle events", function(assert) {
	assert
	.equal(emitter.emit("ev0", "emit0"), 0)
	.equal(emitted, expected)

	.equal(emitter.off("ev1", ev1), emitter)
	.equal(emitter.on("ev1", ev1), emitter)
	.equal(emitter.emit("ev1", "emit1"), 1)
	.equal(emitted.length, expected.push("ev1:emit1"))
	.equal(emitted, expected)

	.equal(emitter.on("ev2", ev2), emitter)
	.equal(emitter.emit("ev1", "emit2"), 1)
	.equal(emitted.length, expected.push("ev1:emit2"))
	.equal(emitted, expected)

	.equal(emitter.emit("ev2", "emit3"), 1)
	.equal(emitted.length, expected.push("ev2:emit3"))
	.equal(emitted, expected)

	.equal(emitter.emit("ev3", "emit4"), 0)
	.equal(emitted, expected)

	.equal(emitter.on("ev3", ev3), emitter)
	.equal(emitter.emit("ev1", "emit5"), 1)
	.equal(emitted.length, expected.push("ev1:emit5"))
	.equal(emitter.emit("ev2", "emit6"), 1)
	.equal(emitted.length, expected.push("ev2:emit6"))
	.equal(emitter.emit("ev3", "emit7"), 1)
	.equal(emitted.length, expected.push("ev3:emit7"))
	.equal(emitted, expected)

	// many listeners
	.equal(emitter.on("all", ev1), emitter)
	.equal(emitter.on("all", ev2), emitter)
	.equal(emitter.on("all", ev3), emitter)
	.equal(emitter.on("all", ev4), emitter)
	.equal(emitter.emit("all", "emit8"), 4)
	.equal(emitted.length, (expected.push("ev1:emit8"), expected.push("ev2:emit8"), expected.push("ev3:emit8"), expected.push("ev4:emit8")))
	.equal(emitted, expected)

	// remove from middle
	.equal(emitter.off("all", ev2), emitter)
	.equal(emitter.emit("all", "emit9"), 3)
	.equal(emitted.length, (expected.push("ev1:emit9"), expected.push("ev3:emit9"), expected.push("ev4:emit9")))
	.equal(emitted, expected)

	.equal(emitter.off("all", ev2), emitter)
	.equal(emitter.emit("all", "emit9"), 3)
	.equal(emitted.length, (expected.push("ev1:emit9"), expected.push("ev3:emit9"), expected.push("ev4:emit9")))
	.equal(emitted, expected)

	// remove from beginning
	.equal(emitter.off("all", ev1), emitter)
	.equal(emitter.emit("all", "emit10"), 2)
	.equal(emitted.length, (expected.push("ev3:emit10"), expected.push("ev4:emit10")))
	.equal(emitted, expected)

	// remove from end
	.equal(emitter.off("all", ev4), emitter)
	.equal(emitter.emit("all", "emit11"), 1)
	.equal(emitted.length, expected.push("ev3:emit11"))
	.equal(emitted, expected)

	// remove last
	.equal(emitter.off("all", ev3), emitter)
	.equal(emitter.emit("all", "emit12"), 0)
	.equal(emitted, expected)

	// emit newListener and removeListener
	emitted.length = expected.length = 0
	assert
	.equal(em3.on("removeListener", ev3remove), em3)
	.equal(em3.on("newListener", ev3new), em3)
	.equal(emitted.length, 0)
	.equal(em3.on("ev3", ev3a, emitter, ev3b), em3)
	.equal(emitted.length, expected.push("ev3new:ev3", emitter, ev3b))
	.equal(em3.off("ev3", ev3a, emitter, ev3b), em3)
	.equal(emitted.length, expected.push("ev3remove:ev3", emitter, ev3b))
	.equal(emitted, expected)

	// remove all listeners
	emitted.length = expected.length = 0
	assert
	.equal(emitter.on("all", ev1), emitter)
	.equal(emitter.on("all", ev2), emitter)
	.equal(emitter.on("all", ev3), emitter)
	.equal(emitter.on("all", ev4), emitter)
	.equal(emitter.emit("all", "emit8"), 4)
	.equal(emitted.length, (expected.push("ev1:emit8"), expected.push("ev2:emit8"), expected.push("ev3:emit8"), expected.push("ev4:emit8")))
	.equal(emitted, expected)
	.equal(emitter.off("all"), emitter)
	.equal(emitter.emit("all", "emit8"), 0)
	.equal(emitted, expected)

	// handle scope
	emitted.length = expected.length = 0
	assert
	.equal(emitter.on("ev", scope1.handler, scope1), emitter)
	.equal(emitter.emit("ev", "emit3"), 1)
	.equal(emitted.length, expected.push("scope1 emit3"))
	.equal(emitted, expected)

	.equal(emitter.one("ev", scope1.handler, scope2), emitter)
	.equal(emitter.one("ev2", ev2), emitter)
	.equal(emitter.emit("ev", "emit4"), 3)
	.equal(emitted.length, (expected.push("scope1 emit4"), expected.push("scope2 emit4")))
	.equal(emitted, expected)

	.equal(emitter.emit("ev", "emit5"), 1)
	.equal(emitted.length, expected.push("scope1 emit5"))
	.equal(emitted, expected)

	// remove listener by origin
	emitted.length = expected.length = 0
	assert
	.equal(emitter.on("s4", ev4, null, "foo"), emitter)
	.equal(emitter.emit("s4", "emit1"), 1)
	.equal(emitted.length, expected.push("ev4:emit1"))
	.equal(emitted, expected)
	.equal(emitter.off("s4", "bar"), emitter)
	.equal(emitter.emit("s4", "emit2"), 1)
	.equal(emitted.length, expected.push("ev4:emit2"))
	.equal(emitted, expected)
	.equal(emitter.off("s4", "foo"), emitter)
	.equal(emitter.emit("s4", "emit3"), 0)
	.equal(emitted, expected)

	// remove listener by origin with scope
	.equal(emitter.on("s5", scope1.handler, scope1, "foo"), emitter)
	.equal(emitter.emit("s5", "emit1"), 1)
	.equal(emitted.length, expected.push("scope1 emit1"))
	.equal(emitted, expected)
	.equal(emitter.off("s5", "bar"), emitter)
	.equal(emitter.emit("s5", "emit2"), 1)
	.equal(emitted.length, expected.push("scope1 emit2"))
	.equal(emitted, expected)
	.equal(emitter.off("s5", "foo", scope1), emitter)
	.equal(emitter.emit("s5", "emit3"), 0)
	.equal(emitted, expected)

	// listen and unlisten
	emitted.length = expected.length = 0
	assert
	.equal(emitter.unlisten("ev1"), emitter)
	.equal(emitter.listen(em1, "ev1", ev1), emitter)
	.equal(emitter.listen(em2, "ev1", ev1), emitter)
	.equal(em1.emit("ev1", "emit1"), 1)
	.equal(emitted.length, expected.push("ev1:emit1"))
	.equal(em2.emit("ev1", "emit2"), 1)
	.equal(emitted.length, expected.push("ev1:emit2"))
	.equal(emitted, expected)
	.equal(emitter.unlisten("ev2"), emitter)
	.equal(emitter.unlisten("ev1"), emitter)
	.equal(em1.emit("ev1", "emit3"), 0)
	.equal(em2.emit("ev1", "emit4"), 0)
	.equal(emitted, expected)
	.equal(emitter._l.length, 0)
	.equal(emitter.listen(null, "ev1", ev1), emitter)
	.equal(emitter._l.length, 0)
	.equal(emitter.listen(events, "ev1", ev1), emitter)
	.equal(emitter.listen(events, "ev2", ev2), emitter)

	em1.on.call(events, null, "event")
	em1.one.call(events, "ev2", "event")

	assert
	.equal(em1.emit.call(events, "ev2", 1), 3)
	.equal(em1.emit.call(events, "ev2", 1), 2)

	.equal(emitter._l.length, 2)
	.equal(emitter.unlisten("*"), emitter)
	.equal(emitter._l.length, 0)
	.end()
})

