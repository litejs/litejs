

var undef, a, b, c
, date = new Date()
, util = require("../../lib/json")
, obj =
	{ "foo": ["bar", "baz"]
	, "": 0
	, "a/b": 1
	, "c%d": 2
	, "e^f": 3
	, "g|h": 4
	, "i\\j": 5
	, "k\"l": 6
	, " ": 7
	, "m~n": 8
	}
, clone1 = util.clone(obj)
, obj2 = {
	"m.n": 9
}
, tests =
	[ {"a":"b"}         , {"a":"c"}                 , {"a":"c"}         , ["/a"], {"/a":"b"}
	, {"a":"b"}         , {"b":"c"}                 , {"a":"b","b":"c"} , ["/b"], {"/b":undef}
	, {"a":"b"}         , {"a":null}                , {}                , ["/a"], {"/a":"b"}
	, {"a":"b"}         , {"a":undef}               , {"a":"b"}         , [], {}
	, {"a":"b"}         , {"b":undef}               , {"a":"b"}         , [], {}
	, {"a":"b","b":"c"} , {"a":null}                , {"b":"c"}         , ["/a"], {"/a":"b"}
	, {"a":["b"]}       , {"a":"c"}                 , {"a":"c"}         , ["/a"], {"/a": ["b"]}
	, {"a":"c"}         , {"a":["b"]}               , {"a":["b"]}       , ["/a"], {"/a":"c"}
	, {"a":{"b":"c"}}   , {"a":{"b":"d","c":null}}  , {"a":{"b":"d"}}   , ["/a/b", "/a"], {"/a/b":"c"}
	, {"a":{"b":"c"}}   , {"a":{"b":"c"}}           , {"a":{"b":"c"}}   , [], {}

	, {"a":{"b":0}}     , {"a":{"b":1}}             , {"a":{"b":1}}     , ["/a/b", "/a"], {"/a/b":0}
	, {"a":{"b":0}}     , {"a":{"b":null}}          , {"a":{}}          , ["/a/b", "/a"], {"/a/b":0}
	, {"a":{"b":1}}     , {"a":{"b":0}}             , {"a":{"b":0}}     , ["/a/b", "/a"], {"/a/b":1}
	, {"a":{"b":1}}     , {"a":{"b":null}}          , {"a":{}}          , ["/a/b", "/a"], {"/a/b":1}
	, {"a":{"b":null}}  , {"a":{"b":0}}             , {"a":{"b":0}}     , ["/a/b", "/a"], {"/a/b":null}
	, {"a":{"b":null}}  , {"a":{"b":1}}             , {"a":{"b":1}}     , ["/a/b", "/a"], {"/a/b":null}

	, {"a":[{"b":"c"}]} , {"a":[1]}                 , {"a":[1]}         , ["/a"], {"/a": [{"b":"c"}]}
	, {"a":[{"b":"c"}]} , {"a":{"b":"c"}}           , {"a":{"b":"c"}}   , ["/a/b", "/a"], {"/a/b":undef,"/a":[{"b":"c"}]}
	, {"a":{"b":"c"}}   , {"a":[{"b":"c"}]}         , {"a":[{"b":"c"}]} , ["/a/b", "/a"], {"/a/b":"c"}
	, ["a","b"]         , ["c","d"]                 , ["c","d"]         , [], {}
	, {"a":"b"}         , ["c"]                     , ["c"]             , ["/a"], {"/a":"b"}
	, {"a":"foo"}       , null                      , null              , ["/a"], {"/a":"foo"}
	, {"a":"foo"}       , "bar"                     , "bar"             , ["/a"], {"/a":"foo"}
	, {"e":null}        , {"a":1}                   , {"e":null,"a":1}  , ["/a"], {"/a":undef}
	, {"e":null}        , {"e":null}                , {}                , ["/e"], {"/e":null}
	, {"e":null}        , {"e":1}                   , {"e":1}           , ["/e"], {"/e":null}
	, {"e":0}           , {"e":1}                   , {"e":1}           , ["/e"], {"/e":0}
	, {"e":1}           , {"e":0}                   , {"e":0}           , ["/e"], {"/e":1}
	, [1,2]             , {"a":"b","c":null}        , {"a":"b"}         , ["/a"], {"/a":undef}
	, {}                , {"a":{"bb":{"ccc":null}}} , {"a":{"bb":{}}}   , ["/a/bb", "/a"], {"/a/bb":undef,"/a":undef}
	, {}                , clone1                    , clone1               , ["/foo", "/", "/a~1b", "/c%d", "/e^f", "/g|h", "/i\\j", "/k\"l", "/ ", "/m~0n"], {"/foo":undef, "/":undef, "/a~1b":undef, "/c%d":undef, "/e^f":undef, "/g|h":undef, "/i\\j":undef, "/k\"l":undef, "/ ":undef, "/m~0n":undef}
	]




var test = require("testman").

describe ("JSON.mergePatch").
it("should apply merge patches")

for (var x = 0; x < tests.length; )
	addTest("mergePatch", tests[x++], tests[x++], tests[x++], tests[x++], tests[x++])

test.
it ("should work with old Object.deepMerge tests").
	run(function(){
		a = { a:"A"
			, b:null
			, c:"C"
			, d:null
			, e:{ea:"EA", eb:null, ec:"EC", ed:null}
			, f:null
			, g:{ga:1}
		}
		b = { b:"B"
			, c:null
			, e: {eb:"EB", ec:null}
			, f: {fa:1}
			, g: null
		}
		c = []
		util.mergePatch(a, b, c)
	}).
	deepEqual(a, {"a":"A","b":"B","d":null,"e":{"ea":"EA","eb":"EB","ed":null},"f":{"fa":1}}).
	deepEqual(b, {"b":"B","c":null,"e":{"eb":"EB","ec":null},"f":{"fa":1},"g":null}).
	deepEqual(c, ["/b","/c","/e/eb","/e/ec","/e","/f/fa","/f","/g"]).

it ("merges objects").
equal(util.merge({a: 1}, {b: 2}), {a: 1, b: 2}).
equal(util.merge({a: 1}, Object.create({b: 2}), {c: 3}), {a: 1, c: 3}).

it ("has isObject").
equal(util.isObject({}), true).
equal(util.isObject(), false).
equal(util.isObject(null), false).
equal(util.isObject(""), false).
equal(util.isObject("a"), false).
equal(util.isObject(0), false).
equal(util.isObject(1), false).
equal(util.isObject([]), false).

describe ("util.clone").
test("it clones objects", function(assert) {
	Object.prototype.dummy = 123
	var dateClone = util.clone(date)
	, map = {a:3}
	, mapClone = util.clone(map)
	, re1 = /ab/
	, re1Clone = util.clone(re1)
	, re2 = /ab/g
	, re2Clone = util.clone(re2)
	, re3 = /ab/i
	, re3Clone = util.clone(re3)
	, re4 = /ab/m
	, re4Clone = util.clone(re4)
	, re5 = /ab/gim
	, re5Clone = util.clone(re5)
	, arr = [1, "2", date, map, re1]
	, arrClone = util.clone(arr)

	assert.notStrictEqual(arr, arrClone)
	assert.notStrictEqual(date, dateClone)
	assert.notStrictEqual(map, mapClone)
	assert.notStrictEqual(re1, re1Clone)
	assert.notStrictEqual(re2, re2Clone)
	assert.notStrictEqual(re3, re3Clone)
	assert.notStrictEqual(re4, re4Clone)
	assert.notStrictEqual(re5, re5Clone)

	assert.deepEqual(arr, arrClone)
	assert.deepEqual(date, dateClone)
	assert.deepEqual(map, mapClone)
	assert.deepEqual(re1, re1Clone)
	assert.deepEqual(re2, re2Clone)
	assert.deepEqual(re3, re3Clone)
	assert.deepEqual(re4, re4Clone)
	assert.deepEqual(re5, re5Clone)

	delete Object.prototype.dummy
})

//it("should be V8 friendly").
//isOptimized(util.pointer, [{}, "/a/b/c"]).
//isOptimized(util.mergePatch, [{a:1}, {b:2}]).
//isOptimized(util.clone, [{a:1}]).
//isOptimized(util.merge, [{a:1}, {b:2}]).
//isOptimized(util.isObject, [{a:1}]).
//isOptimized(util.isObject, ["a"]).


function addTest(method, a, b, c, d, e) {
	var changes = []
	, previous = {}
	test = test.deepEqual(util[method](util.clone(a), b, changes, previous), c)
	test = test.deepEqual(changes, d)
	test = test.deepEqual(util[method](util.clone(a), b), c)

	if (e) {
		test = test.deepEqual(previous, e)
	}
}


