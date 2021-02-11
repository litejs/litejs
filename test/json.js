



describe("JSON", function() {
	require("../json")
	var undef, a, b, c
	, isArray = Array.isArray
	, json = JSON
	, matcher = json.matcher
	, filterStr = matcher.str
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
	, clone1 = json.clone(obj)
	, obj2 = {
		"m.n": 9
	}

	this
	.test(".clone()", function(assert, mock) {
		mock.replace(Object.prototype, "bad", 1)

		var date = new Date()  , dateClone = json.clone(date)
		, map = {a:3}          , mapClone = json.clone(map)
		, re1 = /ab/           , re1Clone = json.clone(re1)
		, re2 = /a\+[]()]b/gim , re2Clone = json.clone(re2)
		, arr = [1, "2", date, map, re1, re2], arrClone = json.clone(arr)

		assert
		.notStrictEqual(arr, arrClone)
		.notStrictEqual(date, dateClone)
		.notStrictEqual(map, mapClone)
		.notStrictEqual(re1, re1Clone)
		.notStrictEqual(re2, re2Clone)
		.equal(arr, [1, "2", dateClone, mapClone, re1Clone, re2Clone])
		.end()
	})
	.test(".isObject()", function(assert) {
		assert.equal(
			[{}, undef, null, "", "a", 0, 1, []].map(json.isObject),
			[true, false, false, false, false, false, false, false ]
		)
		.end()
	})
	.test(".mergePatch()", function(assert, mock) {
		var a, b, tests =
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

		mock.replace(Object.prototype, "bad", 1)

		function addTest(a, b, c, d, e) {
			var changes = []
			, previous = {}
			assert.equal(json.mergePatch(json.clone(a), b, changes, previous), c)
			.equal(changes, d)
			.equal(json.mergePatch(json.clone(a), b), c)

			if (e) {
				assert.equal(previous, e)
			}
		}
		for (var x = 0; x < tests.length; ) {
			addTest(tests[x++], tests[x++], tests[x++], tests[x++], tests[x++])
		}

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
		json.mergePatch(a, b, c)

		assert.equal(a, {"a":"A","b":"B","d":null,"e":{"ea":"EA","eb":"EB","ed":null},"f":{"fa":1}})
		.equal(b, {"b":"B","c":null,"e":{"eb":"EB","ec":null},"f":{"fa":1},"g":null})
		.equal(c, ["/b","/c","/e/eb","/e/ec","/e","/f/fa","/f","/g"])
		.end()
	})
	.test(".tr()", function(assert) {
		var tmp
		, obj = {
			id: 1,
			map: { a: 2, b: 3, c: 4 },
			firstName: "John",
			age: 21,
			rel: [
				{ type: "father", firstName: "Bob" },
				{ type: "mother", firstName: "Mary" },
				{ type: "child", firstName: "Lisa" },
				{ type: "child", firstName: "Bart" }
			]
		}

		tmp = json.tr("id,name:firstName,mother:rel[type=mother|a=':'].firstName")
		assert.equal(tmp(obj), {
			id: 1,
			name: "John",
			mother: "Mary"
		})

		// last one owerride previous
		tmp = json.tr("id,,map,map.a")
		assert.equal(tmp(obj), { id: 1, map: {a:2} })
		tmp = json.tr("id,map.a,map")
		assert.equal(tmp(obj), { id: 1, map: { a: 2, b: 3, c: 4 } })
		tmp = json.tr("id,map.a,map.c")
		assert.equal(tmp(obj), { id: 1, map: {a:2,c:4} })

		tmp = json.tr("id,map.a,map.b:map.c")
		assert.equal(tmp(obj), { id: 1, map: {a:2,b:4} })

		//tmp = json.tr("id,day:text{'kala'}")
		//assert.equal(tmp(obj), { id: 1, text: "kala" })
		assert.end()

	})

	.describe("->set/get", function(){
		var obj =
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
		, obj2 = {
			"a\nb": 10,
			"m.n": 9,
			a: [{b:1,c:"2"},{b:3,c:"4"},{b:5,d:6}],
			b: ["A", "B", "C"],
			list: {
				a: {x:1},
				b: {x:2},
				c: {y:3}
			}
		}
		, get = json.get
		, set = json.set

		this
		.should("get and set by pointer", function(assert) {
			var obj = {
				a: ["A", "B", "C"],
				b: {"0": "D", "1": "E", "2": "F"},
				c: 1
			}
			assert
			.equal(get.str("a[@c]"), "(o=o['a'])&&i(o)&&(c=o[p('c')(d)])")
			.equal(get.str("a[@c]",true), "(o=i(o['a'])?o['a']:(o['a']=[]))&&((c=o[p('c')(d)]),(o[p('c')(d)]=v),c)")
			.equal(get(obj, "a[@c]"), "B")
			.equal(set(obj, "a[@c]", "BB"), "B")
			.equal(get(obj, "a[@c]"), "BB")
			.equal(get.str("b{@c}"), "(o=o['b'])&&j(o)&&(c=o[p('c')(d)])")
			.equal(get.str("b{@c}",true), "(o=j(o['b'])?o['b']:(o['b']={}))&&((c=o[p('c')(d)]),(o[p('c')(d)]=v),c)")
			.equal(get(obj, "b{@c}"), "E")
			.equal(set(obj, "b{@c}", "EE"), "E")
			.equal(get(obj, "b{@c}"), "EE")
			assert.end()
		})
		.should("apply extensions", function(assert) {
			var obj = {
				a: "21.1",
				b: "21,2",
				c: null,
				d: "null",
				e: "2009-02-13T23:31:30Z"
			}
			assert.equal(get(obj, "a;toNum"), 21.1)
			assert.equal(get(obj, "b;toNum:','"), 21.2)
			assert.equal(get(obj, "c;toNum"), null)
			assert.equal(get(obj, "d;toNum"), null)
			assert.equal(get(obj, "e;toDate"), 1234567890000)
			assert.end()
		})
		.should("get a new array or map", function(assert) {
			var obj = {
				a: [{b:1,c:"2"},{b:3,c:"4"},{b:5,d:6}],
				list: { a: {x:1}, b: {x:2}, c: {y:3} }
			}
			assert

			.equal(get.str("a[]*"), "(o=o['a'])&&i(o)&&(c=f(o,1))")
			.equal(get.str("a{}*"), "(o=o['a'])&&j(o)&&(c=f(o,1))")
			.equal(get.str("a[]*",true), "(o=i(o['a'])?o['a']:(o['a']=[]))&&(c=f(o,1,0,v))")
			.equal(get.str("a{}*",true), "(o=j(o['a'])?o['a']:(o['a']={}))&&(c=f(o,1,0,v))")

			.equal(get.str("a[c]*"), "(o=o['a'])&&i(o)&&(c=f(o,m('c')))")
			.equal(get.str("a{c}*"), "(o=o['a'])&&j(o)&&(c=f(o,m('c')))")
			.equal(get.str("a[c]*", true), "(o=i(o['a'])?o['a']:(o['a']=[]))&&(c=f(o,m('c'),0,v))")
			.equal(get.str("a{c}*", true), "(o=j(o['a'])?o['a']:(o['a']={}))&&(c=f(o,m('c'),0,v))")

			.equal(get.str("a[c]*d"), "(o=o['a'])&&i(o)&&(c=f(o,m('c'),p('d')))")
			.equal(get.str("a{c}*d"), "(o=o['a'])&&j(o)&&(c=f(o,m('c'),p('d')))")
			.equal(get.str("a[c]*d", true), "(o=i(o['a'])?o['a']:(o['a']=[]))&&(c=f(o,m('c'),p('d',true),v))")
			.equal(get.str("a{c}*d", true), "(o=j(o['a'])?o['a']:(o['a']={}))&&(c=f(o,m('c'),p('d',true),v))")

			.equal(get.str("a[c]^d"), "(o=o['a'])&&i(o)&&(c=f(o,m('c'),r('d')))")
			.equal(get.str("a{c}^d"), "(o=o['a'])&&j(o)&&(c=f(o,m('c'),r('d')))")

			.equal(get.str("a[c=a[bc]]*na.me"), "(o=o['a'])&&i(o)&&(c=f(o,m('c=a[bc]'),p('na.me')))")

			.equal(get(obj, "a[]*"  ), [{b:1,c:"2"},{b:3,c:"4"},{b:5,d:6}])
			.equal(get(obj, "a[!c]*"  ), [{b:5,d:6}])
			.equal(get(obj, "a[c]*c"  ), ["2", "4"])
			.equal(set(obj, "a[c]*c", 5), ["2", "4"])
			.equal(get(obj, "a[c]*c"  ), [5, 5])
			.equal(get(obj, "list{}*"), [{x:1}, {x:2}, {y:3}])
			.equal(get(obj, "list{x}*"    ), [{x:1}, {x:2}])
			.equal(get(obj, "list{x}^i:x"    ), [{i:1},{i:2}])
			.equal(set(obj, "list{}*", false ), [{x:1}, {x:2}, {y:3}])
			.equal(get(obj, "list{}*"), [false, false, false])
			.end()
		})
		.it("should get", function(assert) {
			assert
			.equal(get.str("foo"), "(c=o['foo'])")
			.equal(get.str("a"), "(c=o['a'])")
			.equal(get.str("a."), "(c=o['a.'])")
			.equal(get.str(""), "(c=o[''])")
			.equal(get.str("."), "(c=o['.'])")
			.equal(get.str(".."), "(c=o['..'])")
			.equal(get.str(".a"), "(c=o['.a'])")
			.equal(get.str("..a"), "(o=o['.'])&&(c=o['a'])")
			.equal(get.str("a.."), "(c=o['a..'])")
			.equal(get.str("a..."), "(c=o['a...'])")
			.equal(get.str("a...b"), "(o=o['a..'])&&(c=o['b'])")
			.equal(get.str("ab.cd"), "(o=o['ab'])&&(c=o['cd'])")
			.equal(get.str("a\n'"), "(c=o['a\\x0A\\x27'])")
			.equal(get.str("a[]"), "(c=o['a'])&&i(c)&&c")
			.equal(get.str("a{}"), "(c=o['a'])&&j(c)&&c")
			.equal(get.str("a[@]"), "(o=o['a'])&&i(o)&&(c=o.length)")
			.equal(get.str("a{@}"), "(o=o['a'])&&j(o)&&(c=K(o).length)")
			.equal(get.str("a[*]"), "(o=o['a'])&&i(o)&&(c=o)")
			.equal(get.str("a{*}"), "(o=o['a'])&&j(o)&&(c=K(o))")
			.equal(get.str("a[12]"), "(o=o['a'])&&i(o)&&(c=o[12])")
			.equal(get.str("ab.cd[ef=gh].ij"), "(o=o['ab'])&&(o=o['cd'])&&i(o)&&(o=I(o,m('ef=gh')))&&(c=o['ij'])")
			.equal(get.str("ab.cd[ef=[gh]*].ij"), "(o=o['ab'])&&(o=o['cd'])&&i(o)&&(o=I(o,m('ef=[gh]*')))&&(c=o['ij'])")

			// get and set with returning previous value
			assert
			.equal(get(obj, ""  ), 0)
			.equal(set(obj, "", 1), 0)
			.equal(get(obj, ""  ), 1)
			.equal(get(obj2, "a\nb"  ), 10)
			.equal(set(obj2, "a\nb", 11), 10)
			.equal(get(obj2, "a\nb"  ), 11)

			.equal(get.str("b[0]"), "(o=o['b'])&&i(o)&&(c=o[0])")
			.equal(get(obj2, "b[0]"  ), "A")
			.equal(get(obj2, "b[1]"  ), "B")
			.equal(get(obj2, "b[2]"  ), "C")
			.equal(get(obj2, "b[@]"  ), 3)
			.equal(get(obj2, "b[*]"  ), ["A", "B", "C"])
			.equal(get.str("b[-1]"), "(o=o['b'])&&i(o)&&(c=o[o.length-1])")
			.equal(get(obj2, "b[-1]"  ), "C")
			.equal(get(obj2, "b[-2]"  ), "B")
			.equal(get(obj2, "b[-3]"  ), "A")
			.equal(get.str("b[0]", true), "(o=i(o['b'])?o['b']:(o['b']=[]))&&((c=o[0]),(o[0]=v),c)")
			.equal(get.str("b[-1]", true), "(o=i(o['b'])?o['b']:(o['b']=[]))&&((c=o[o.length-1]),(o[o.length-1]=v),c)")
			.equal(set(obj2, "b[0]", "a"), "A")
			.equal(get(obj2, "b[0]"  ), "a")
			.equal(set(obj2, "b[3]", "D"), null)
			.equal(get(obj2, "b[3]"  ), "D")
			.equal(get.str("b[-]", true), "(o=i(o['b'])?o['b']:(o['b']=[]))&&((c=o[o.length]),(o[o.length]=v),c)")
			.equal(set(obj2, "b[-]", "E"), null)
			.equal(get(obj2, "b[4]"  ), "E")

			.equal(get.str("a[0].b"), "(o=o['a'])&&i(o)&&(o=o[0])&&(c=o['b'])")
			.equal(get.str("a[0].b", true), "(o=i(o['a'])?o['a']:(o['a']=[]))&&(o=typeof o[0]==='object'&&o[0]||(o[0]={}))&&((c=o['b']),(o['b']=v),c)")
			.equal(get(obj2, "a[0].b"  ), 1)
			.equal(set(obj2, "a[0].b", 2), 1)
			.equal(get(obj2, "a[0].b"  ), 2)
			.equal(get(obj2, "a[1].b"  ), 3)

			.equal(get(obj2, "a[c=2]"  ), obj2.a[0])
			.equal(get(obj2, "a[c=4]"  ), obj2.a[1])
			.equal(get(obj2, "a[c]"  ), obj2.a[0])
			.equal(get(obj2, "list{x=1}"  ), obj2.list.a)
			.equal(get(obj2, "list{x=2}"  ), obj2.list.b)
			.equal(get(obj2, "list{@}"    ), 3)

			.equal(get.str("list{*}.0"), "(o=o['list'])&&j(o)&&(o=K(o))&&(c=o['0'])")
			.equal(get(obj2, "list{*}"    ), ["a", "b", "c"])
			.equal(get(obj2, "list{*}.0"    ), "a")

			.equal(get.str("list{x}"), "(o=o['list'])&&j(o)&&(c=J(o,m('x')))")
			.equal(get(obj2, "list{x}"    ), obj2.list.a)
			.equal(get(obj2, "list{y}"    ), obj2.list.c)

			.equal(get.str("a[c=2]"), "(o=o['a'])&&i(o)&&(c=I(o,m('c=2')))")
			.equal(get.str("a[c=3]", true), "(o=i(o['a'])?o['a']:(o['a']=[]))&&(t=I(o,m('c=3'),1))!=null&&((c=o[t]),(o[t]=v),c)")
			.equal(get.str("a[c=4].b"), "(o=o['a'])&&i(o)&&(o=I(o,m('c=4')))&&(c=o['b'])")
			.equal(get.str("a[c=5].b", true), "(o=i(o['a'])?o['a']:(o['a']=[]))&&(t=I(o,m('c=5'),1))!=null&&(o=typeof o[t]==='object'&&o[t]||(o[t]={}))&&((c=o['b']),(o['b']=v),c)")
			.equal(get(obj2, "a[c=2].b"  ), 2)
			.equal(set(obj2, "a[c=2].b", 1), 2)
			.equal(get(obj2, "a[c=2].b"  ), 1)
			.equal(get(obj2, "a[c=3].b"  ), null)
			.equal(set(obj2, "a[c=3].b", "BB"), null)
			.equal(get(obj2, "a[3].b"  ), "BB")

			.equal(get.str("list{x=2}.x", true), "(o=j(o['list'])?o['list']:(o['list']={}))&&(t=J(o,m('x=2'),1))!=null&&(o=typeof o[t]==='object'&&o[t]||(o[t]={}))&&((c=o['x']),(o['x']=v),c)")
			.equal(set(obj2, "list{x=2}.x", 3), 2)

			.equal(get(obj2, "a[c=4].b"  ), 3)
			.equal(get(obj2, "a[]"  ), obj2.a)
			.equal(get.str("a.push(1)"), "(o=o['a'])&&(c=o['push(1)'])")
			.equal(get.str("a.push(1)", true), "(o=typeof o['a']==='object'&&o['a']||(o['a']={}))&&((c=o['push(1)']),(o['push(1)']=v),c)")

			assert.end()
		})
		.it("should resolve pointers", function(assert) {
			assert
			.equal(json.get(obj, "/foo"   ), obj.foo)
			.equal(json.get(obj, "/foo/0" ), "bar")
			.equal(json.get(obj, "/foo/1" ), "baz")
			//.equal(json.get(obj, "/"      ), 0)
			.equal(json.get(obj, "/a~1b"  ), 1)
			.equal(json.get(obj, "/c%d"   ), 2)
			.equal(json.get(obj, "/e^f"   ), 3)
			.equal(json.get(obj, "/g|h"   ), 4)
			.equal(json.get(obj, "/i\\j"  ), 5)
			.equal(json.get(obj, "/k\"l"  ), 6)
			.equal(json.get(obj, "/ "     ), 7)
			.equal(json.get(obj, "/m~0n"  ), 8)
			.equal(json.get(obj2, "/m.n"   ), 9)
			.end()
		})

		.it("should resolve dot notation", function(assert) {
			assert
			.equal(json.get(obj, "foo"    ), obj.foo)
			.equal(json.get(obj, "foo.0"  ), "bar")
			.equal(json.get(obj, "foo[0]"  ), "bar")
			.equal(json.get(obj2, "a[0].b"  ), 1)
			.equal(json.get(obj2, "a[1].b"  ), 3)
			.equal(json.get(obj2, "a[c=2].b"  ), 1)
			.equal(json.get(obj2, "a[c=4].b"  ), 3)
			.equal(json.get(obj, "foo.1"  ), "baz")
			//.equal(json.get(obj, ""       ), 0)
			.equal(json.get(obj, "a/b"    ), 1)
			.equal(json.get(obj, "c%d"    ), 2)
			.equal(json.get(obj, "e^f"    ), 3)
			.equal(json.get(obj, "g|h"    ), 4)
			.equal(json.get(obj, "i\\j"   ), 5)
			.equal(json.get(obj, "k\"l"   ), 6)
			.equal(json.get(obj, " "      ), 7)
			.equal(json.get(obj, "m~n"    ), 8)
			.end()
		})

		.it("should set values by pointers and return old values", function(assert) {
			assert
			//.equal(json.set(obj, "/"      , 1), 0)
			//.equal(json.set(obj, "/"         ), 1)
			.equal(json.set(obj, "/a~1b"  , 2), 1)
			.equal(json.set(obj, "/a~1b"     ), 2)
			.equal(json.set(obj, "/c%d"   , 3), 2)
			.equal(json.set(obj, "/c%d"      ), 3)
			.equal(json.set(obj, "/e^f"   , 4), 3)
			.equal(json.set(obj, "/e^f"      ), 4)
			.equal(json.set(obj, "/g|h"   , 5), 4)
			.equal(json.set(obj, "/g|h"      ), 5)
			.equal(json.set(obj, "/i\\j"  , 6), 5)
			.equal(json.set(obj, "/i\\j"     ), 6)
			.equal(json.set(obj, "/k\"l"  , 7), 6)
			.equal(json.set(obj, "/k\"l"     ), 7)
			.equal(json.set(obj, "/ "     , 8), 7)
			.equal(json.set(obj, "/ "        ), 8)
			.equal(json.set(obj, "/m~0n"  , 9), 8)
			.equal(json.set(obj, "/m~0n"     ), 9)
			.equal(json.set(obj, "/foo/0" , 1), "bar")
			.equal(json.set(obj, "/foo/0"    ), 1)
			.equal(json.set(obj, "/foo/1"    ), "baz")
			.equal(json.set(obj, "/a/b/c" , 3), undef)
			.equal(json.set(obj, "/a/b/c"    ), 3)
			.equal(json.set(null, "/a/b/c"    ), undef)
			.equal(json.set(0, "/a/b/c"    ), undef)
			.equal(json.set("", "/a/b/c"    ), undef)
			.end()
		})

		.test("throw", function(assert) {
			var arr = [
				"a{A.push(1)}",
				"b{B.push(1)}.bB",
				"c[C.push(1)]",
				"c[C.push(1)&&1]",
				"d[D.push(1)].dD"
			], i = arr.length
			for (; i--; ) {
				assert.throws(function () {
					get(obj2, arr[i])
				}, "Filter " + arr[i] + " should throw")
				assert.throws(function () {
					set(obj2, arr[i], 1)
				}, "Filter " + arr[i] + " should throw")
			}
			assert.end()
		})
	})

	.describe("->filter", function(){
		this
		.test("it should filter", function(assert) {
			var fn, str, test
			, o1 = {id:1, time: Date.now() - 1, a:"1", b:true, n: "Cat", arr: ["a1", 2, "123-456", "3", 567, { conf: "/a/b" }], map: [{q:2}, null]}
			, o2 = {id:2, deep:[1], a:"21", b:false, n: "Batman", map: [{q:1},{q:"123-456",n:"N"},{n:[{d:3}]}]}
			, o3 = {deep:{obj:2,o2:1.5,x:{a:1,b:0}}, dd: Date.parse("2015-09-22T12:31:00Z"), d2: "2015-09-22T12:31:00Z", d3: new Date(Date.parse("2015-09-22T12:31:00Z"))}
			, o4 = {"id.id": 4, colon:"ab:cd","a4":1, arr:[1], deep:{obj:1}, dd: Date.parse("2017-11-02T12:21:00Z")}
			, oAll = [o1, o2, o3, o4]
			, tests = [
				[ "id", "(o=d)&&o['id']", [o1, o2]],
				[ "id\\x2eid", "(o=d)&&o['id\\x2eid']", [o4]],
				[ "a=1&(b=true|c=3)", "(o=d)&&(o['a']==a[0])&&((o=d)&&(o['b']==a[1])||(o=d)&&(o['c']==a[2]))", [o1], [1, true, 3]],
				[ "a=1&((b=true)|c=3)", "(o=d)&&(o['a']==a[0])&&(((o=d)&&(o['b']==a[1]))||(o=d)&&(o['c']==a[2]))", [o1], [1, true, 3]],
				[ "b=true,false,null", "(o=d)&&(o['b']==a[0]||o['b']==a[1]||o['b']==a[2])", [o1, o2, o3, o4], [true, false, null]],
				[ "b==true,false,null", "(o=d)&&(o['b']===a[0]||o['b']===a[1]||o['b']===a[2])", [o1, o2], [true, false, null]],
				[ "id&$select=id", "(o=d)&&o['id']", [o1, o2], [], {"select": "id"}],
				[ "$select=id&id", "(o=d)&&o['id']", [o1, o2], [], {"select": "id"}],
				[ "$select=id", "1", [o1, o2, o3, o4], [], {"select": "id"}],
				[ "$select=id,name", "1", [o1, o2, o3, o4], [], {"select": "id,name"}],
				[ "!id", "(o=d)&&!o['id']", [o3, o4], []],
				[ "id&a", "(o=d)&&o['id']&&(o=d)&&o['a']", [o1, o2], []],
				[ "id;a", "(o=d)&&o['id']&&(o=d)&&o['a']", [o1, o2], []],
				[ "id&&a", "(o=d)&&o['id']&&(o=d)&&o['a']", [o1, o2], []],
				[ "id&&&a", "(o=d)&&o['id']&&(o=d)&&o['a']", [o1, o2], []],
				[ "&id&a", "(o=d)&&o['id']&&(o=d)&&o['a']", [o1, o2], []],
				[ "id&a&", "(o=d)&&o['id']&&(o=d)&&o['a']", [o1, o2], []],
				[ "&id&a&", "(o=d)&&o['id']&&(o=d)&&o['a']", [o1, o2], []],
				[ "/id", "(o=d)&&o['id']", [o1, o2], []],
				[ "/id/e", "(o=d)&&(o=o['id'])&&o['e']", [], []],
				[ "id.e", "(o=d)&&(o=o['id'])&&o['e']", [], []],
				[ "/arr/2=123-456", "(o=d)&&(o=o['arr'])&&(o['2']==a[0])", [o1], ["123-456"]],
				[ "arr.2=123-456", "(o=d)&&(o=o['arr'])&&(o['2']==a[0])", [o1], ["123-456"]],
				[ "a.min-age=21", "(o=d)&&(o=o['a'])&&(o['min-age']==a[0])", [], [21]],
				[ "a.min+age=21", "(o=d)&&(o=o['a'])&&(o['min+age']==a[0])", [], [21]],
				[ "a.min:age=21", "(o=d)&&(o=o['a'])&&(o['min:age']==a[0])", [], [21]],
				[ "it", "(o=d)&&o['it']", [], []],
				[ "id=1", "(o=d)&&(o['id']==a[0])", [o1], [1]],
				[ "id=1,2", "(o=d)&&(o['id']==a[0]||o['id']==a[1])", [o1, o2], [1, 2]],
				[ "id=1,'a b',{i[]={a='{,^|&}'&b=@c}},'} a'", "(o=d)&&(o['id']==a[0]||o['id']==a[1]||m(a[2])(o[\'id\'])||o['id']==a[3])", [o1], [1, "a b", "i[]={a='{,^|&}'&b=@c}", "} a"]],
				[ "id!=1,2", "(o=d)&&!(o['id']==a[0]||o['id']==a[1])", [o3, o4], [1, 2]],
				[ "id==1", "(o=d)&&(o['id']===a[0])", [o1], [1]],
				[ "deep={obj=1}", "(o=d)&&(m(a[0])(o['deep']))", [o4], ["obj=1"]],
				[ "deep={obj>@o2}", "(o=d)&&(m(a[0])(o['deep']))", [o3], ["obj>@o2"]],
				[ "deep={obj=1,2}", "(o=d)&&(m(a[0])(o['deep']))", [o3, o4], ["obj=1,2"]],
				[ "deep.obj=1",   "(o=d)&&(o=o['deep'])&&(o['obj']==a[0])", [o4], [1]],
				[ "deep.obj=1,2", "(o=d)&&(o=o['deep'])&&(o['obj']==a[0]||o['obj']==a[1])", [o3, o4], [1, 2]],
				[ "a4=@deep.obj,", "(o=d)&&(o['a4']!==void 0&&o['a4']==p(a[0])(o))", [o4], ["deep.obj"]],
				[ "a4=$0", "(o=d)&&(o['a4']!==void 0&&o['a4']==b['0'])", [o4], [], null, { "0":1 }],
				[ "id!=1", "(o=d)&&!(o['id']==a[0])", [o2, o3, o4], [1]],
				[ "id!=1,", "(o=d)&&!(o['id']==a[0])", [o2, o3, o4], [1]],
				[ "id!==1", "(o=d)&&!(o['id']===a[0])", [o2, o3, o4], [1]],
				[ "a==1", "(o=d)&&(o['a']===a[0])", [], [1]],
				[ "id>1", "(o=d)&&(o['id']>a[0])", [o2], [1]],
				[ "id>=1", "(o=d)&&(o['id']>=a[0])", [o1, o2], [1]],
				[ "id<2", "(o=d)&&(o['id']<a[0])", [o1], [2]],
				[ "id<=2", "(o=d)&&(o['id']<=a[0])", [o1, o2], [2]],
				[ "a=21", "(o=d)&&(o['a']==a[0])", [o2], [21]],
				[ "a=2?", "(o=d)&&(typeof o['a']==='string'&&a[0].test(o['a']))", [o2], [/^2.$/i]],
				[ "n=[bc]at*", "(o=d)&&(typeof o['n']==='string'&&a[0].test(o['n']))", [o1, o2], [/^[bc]at.*$/i]],
				[ "n=[a-d]at*", "(o=d)&&(typeof o['n']==='string'&&a[0].test(o['n']))", [o1, o2], [/^[a-d]at.*$/i]],
				[ "n=[c-d]at*", "(o=d)&&(typeof o['n']==='string'&&a[0].test(o['n']))", [o1], [/^[c-d]at.*$/i]],
				[ "n=[!c]at*", "(o=d)&&(typeof o['n']==='string'&&a[0].test(o['n']))", [o2], [/^[^c]at.*$/i]],
				[ "n==[Bc]at*", "(o=d)&&(typeof o['n']==='string'&&a[0].test(o['n']))", [o2], [/^[Bc]at.*$/]],
				[ "n=*at*", "(o=d)&&(typeof o['n']==='string'&&a[0].test(o['n']))", [o1, o2],   [/^.*at.*$/i]],
				[ "colon=*:*", "(o=d)&&(typeof o['colon']==='string'&&a[0].test(o['colon']))", [o4],   [/^.*\:.*$/i]],
				[ "n!=*at*", "(o=d)&&!(typeof o['n']==='string'&&a[0].test(o['n']))", [o3, o4], [/^.*at.*$/i]],
				[ "none=*ndef*", "(o=d)&&(typeof o['none']==='string'&&a[0].test(o['none']))", [], [/^.*ndef.*$/i]],
				[ "a='2?','*1'", "(o=d)&&(o['a']==a[0]||o['a']==a[1])", [], ["2?", "*1"]],
				[ "a=2-", "(o=d)&&(o['a']==a[0])", [], ['2-']],
				[ "a=-2", "(o=d)&&(o['a']==a[0])", [], [-2]],
				[ "a=-2-", "(o=d)&&(o['a']==a[0])", [], ["-2-"]],
				[ "id=''", "(o=d)&&(o['id']==a[0])", [], [""]],
				[ "id=", "(o=d)&&(o['id']==a[0])", [], [""]],
				[ "id=1,", "(o=d)&&(o['id']==a[0])", [o1], [1]],
				[ "id=,1,", "(o=d)&&(o['id']==a[0])", [o1], [1]],
				[ "id=,1", "(o=d)&&(o['id']==a[0])", [o1], [1]],
				[ "id='1'", "(o=d)&&(o['id']==a[0])", [o1], ["1"]],
				[ "id='1", "(o=d)&&(o['id']==a[0])", [], ["'1"]],
				[ "id='", "(o=d)&&(o['id']==a[0])", [], ["'"]],
				[ "id=\'", "(o=d)&&(o['id']==a[0])", [], ["'"]],
				[ "id=a\'b", "(o=d)&&(o['id']==a[0])", [], ["a'b"]],
				[ "id=1|id=2", "(o=d)&&(o['id']==a[0])||(o=d)&&(o['id']==a[1])", [o1, o2], [1, 2]],
				[ "(id=1|id=2)&a=1", "((o=d)&&(o['id']==a[0])||(o=d)&&(o['id']==a[1]))&&(o=d)&&(o['a']==a[0])", [o1], [1, 2]],
				[ "id=1&a=1", "(o=d)&&(o['id']==a[0])&&(o=d)&&(o['a']==a[0])", [o1], [1]],
				[ "arr[]", "(o=d)&&i(o['arr'])", [o1, o4], []],
				[ "!arr[]", "(o=d)&&!i(o['arr'])", [o2, o3], []],
				[ "deep{}", "(o=d)&&j(o['deep'])", [o3, o4], []],
				[ "!deep{}", "(o=d)&&!j(o['deep'])", [o1, o2], []],
				[ "deep{a=1}", "(o=d)&&(o=o['deep'])&&j(o)&&J(o,m('a=1'))", [o3], []],
				[ "deep{a=1}.b=0", "(o=d)&&(o=o['deep'])&&j(o)&&(o=J(o,m('a=1')))&&(o['b']==a[0])", [o3], [0]],
				[ "deep{a=1}.b>-1", "(o=d)&&(o=o['deep'])&&j(o)&&(o=J(o,m('a=1')))&&(o['b']>a[0])", [o3], [-1]],
				[ "arr[]=a1", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], ['a1', matcher("==")]],
				[ "arr[]=2",  "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], [2, matcher("==")]],
				[ "arr[]!=2", "(o=d)&&!i(o['arr'])||!(I(o['arr'],a[1](a[0])))", [o2, o3, o4], [2, matcher("==")]],
				[ "arr[]=*23*" , "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], [/^.*23.*$/i, matcher("~")]],
				[ "arr[]!=*23*", "(o=d)&&!i(o['arr'])||!(I(o['arr'],a[1](a[0])))", [o2, o3, o4], [/^.*23.*$/i, matcher("~")]],
				[ "arr[]={conf=/a/b}", "(o=d)&&i(o['arr'])&&(I(o['arr'],m(a[0])))", [o1], ["conf=/a/b"]],
				[ "arr[]={conf='/a/b'}", "(o=d)&&i(o['arr'])&&(I(o['arr'],m(a[0])))", [o1], ["conf='/a/b'"]],
				[ "arr[]={conf='/a/b'}", "(o=d)&&i(o['arr'])&&(I(o['arr'],m(a[0])))", [o1], ["conf='/a/b'"]],
				[ "arr[]!==2", "(o=d)&&!i(o['arr'])||!(I(o['arr'],a[1](a[0])))", [o2, o3, o4], [2, matcher("===")]],
				[ "arr[]==2", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], [2, matcher("===")]],
				[ "arr[]==1,2", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0]))||I(o['arr'],a[1](a[2])))", [o1, o4], [1, matcher("==="), 2]],
				[ "arr[]=='2'", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [], ["2", matcher("===")]],
				[ "arr[]>=2", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], [2, matcher(">=")]],
				[ "arr[]<=2", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1, o4], [2, matcher("<=")]],
				[ "arr[]>2", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], [2, matcher(">")]],
				[ "arr[]<2", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o4], [2, matcher("<")]],
				[ "arr[]=567", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], [567, matcher("==")]],
				[ "arr[]=3", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], [3, matcher("==")]],
				[ "arr[]==3", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [], [3, matcher("===")]],
				[ "arr[]=='3'", "(o=d)&&i(o['arr'])&&(I(o['arr'],a[1](a[0])))", [o1], ["3", matcher("===")]],
				[ "arr[1]=2", "(o=d)&&(o=o['arr'])&&i(o)&&(o[1]==a[0])", [o1], [2]],
				[ "arr[-5]=2", "(o=d)&&(o=o['arr'])&&i(o)&&(o[o.length-5]==a[0])", [o1], [2]],
				[ "arr[@]>5", "(o=d)&&(o=o['arr'])&&i(o)&&(o.length>a[0])", [o1], [5]],
				[ "deep{@}=1", "(o=d)&&(o=o['deep'])&&j(o)&&(K(o).length==a[0])", [o4], [1]],
				[ "deep{}=2,3", "(o=d)&&j(o['deep'])&&(J(o['deep'],a[1](a[0]))||J(o['deep'],a[1](a[2])))", [o3], [2, matcher("=="), 3]],
				[ "deep{*}=o2,o3", "(o=d)&&(o=o['deep'])&&j(o)&&(c=K(o))&&(I(c,a[1](a[0]))||I(c,a[1](a[2])))", [o3], ["o2", matcher("=="), "o3"]],
				[ "map[q=123-456].n=N", "(o=d)&&(o=o['map'])&&i(o)&&(o=I(o,m('q=123-456')))&&(o['n']==a[0])", [o2], ["N"]],
				[ "map[]={q=1,3}", "(o=d)&&i(o['map'])&&(I(o['map'],m(a[0])))", [o2], ["q=1,3"]],
				[ "map[]!={q=1}", "(o=d)&&!i(o['map'])||!(I(o['map'],m(a[0])))", [o1, o3, o4], ["q=1"]],
				[ "map[]={q=123-456}", "(o=d)&&i(o['map'])&&(I(o['map'],m(a[0])))", [o2], ["q=123-456"]],
				[ "map[]={q='123-456'}", "(o=d)&&i(o['map'])&&(I(o['map'],m(a[0])))", [o2], ["q='123-456'"]],
				[ "map[]={q='123-456'}", "(o=d)&&i(o['map'])&&(I(o['map'],m(a[0])))", [o2], ["q='123-456'"]],
				[ "map[]={q='123-456'|q=2}", "(o=d)&&i(o['map'])&&(I(o['map'],m(a[0])))", [o1, o2], ["q='123-456'|q=2"]],
				[ "map[]={n[]={d=3}}", "(o=d)&&i(o['map'])&&(I(o['map'],m(a[0])))", [o2], ["n[]={d=3}"]],
				[ "u1!=u2&map[]={n[]={d=3}}", "(o=d)&&!(o['u1']==a[0])&&(o=d)&&i(o['map'])&&(I(o['map'],m(a[1])))", [o2], ["u2", "n[]={d=3}"]],
				[ "dd=Date{M=11}", "(o=d)&&(m.date(a[0])(o['dd']))", [o4], ["M=11"]],
				[ "dd>=Date{M=9}", "(o=d)&&(m.date(a[0])(o['dd']))", [o3], ["M=9"]],
				[ "d2>=Date{M=9}", "(o=d)&&(m.date(a[0])(o['d2']))", [o3], ["M=9"]],
				[ "d3>=Date{M=9}", "(o=d)&&(m.date(a[0])(o['d3']))", [o3], ["M=9"]],
				[ "dd=Date{M=9,11}", "(o=d)&&(m.date(a[0])(o['dd']))", [o3, o4], ["M=9,11"]],
				[ "dd=Date{M=9&D=2}", "(o=d)&&(m.date(a[0])(o['dd']))", [], ["M=9&D=2"]],
				[ "dd=Date{M=9|D=2}", "(o=d)&&(m.date(a[0])(o['dd']))", [o3, o4], ["M=9|D=2"]],
				[ "dd=Date{w=2}", "(o=d)&&(m.date(a[0])(o['dd']))", [o3], ["w=2"]],
				//[ "time<time{}", "(o=d)&&(o['time']!==void 0&&o[\'a4\']==p(a[0])(o))", [o1], ["@"]],
				//[ "dd=time{now}", "(o=d)&&(m.date(a[0])(o['dd']))", [o3], ["w=2"]],
				[ "", "1", [o1, o2, o3, o4], []]
				//[ "toString", "(o=d)&&o['toString']", [], [o1, o2, o3, o4]],
				//[ "map.toString", "(o=d)&&(o=o['map'])&&o['toString']", [], [o1, o2, o3, o4]],
			]
			, i = 0
			, len = tests.length
			, opts
			, arr
			, fStr
			, rStr


			for (; i<len; ) {
				test = tests[i++]
				opts = {}
				arr = []

				fStr = filterStr(test[0],{},arr)
				rStr = "Row " + i + " " + test[0] + " "
				assert.equal(fStr, test[1], [fStr, rStr, test[1]])
				//*
				fn = json.matcher(test[0], null, opts)
				assert.equal(arr, test[3]||[], [arr, rStr + "attr array", test[3]])
				assert.equal(opts, test[4]||{}, [opts, rStr + "params", test[4]])
				test[2].forEach(function(obj, ii){
					assert.ok(fn(obj, test[5]), test[0] + " " + i + " ok " + ii + " " + JSON.stringify(opts))
				})
				oAll.forEach(function(obj, ii) {
					if (test[2].indexOf(obj) === -1) {
						assert.notOk(fn(obj, test[5]), test[0] + " " + i + " notOk " + ii + " " + JSON.stringify(opts))
					}
				})
				//*/
			}
			assert.end()
		})
		.test("it should parse vals", function(assert) {
			var valRe = json.matcher.valRe
			assert.ok(valRe)
			assert.equal("a\\bc".match(/\\?./g), ["a", "\\b", "c"])
			assert.equal("1".match(valRe), ["1"])
			assert.equal("1,2".match(valRe), ["1", "2"])
			assert.equal("1,'a b',2,'','\"'".match(valRe), ["1", "'a b'", "2", "''", "'\"'"])
			assert.equal(
				'1,"a{,}b",2,{i=1,"a,b"}'.match(valRe),
				["1", '"a{,}b"', "2",'{i=1,"a,b"}'])
			assert.equal(
				'2,{i[]={a="{,^|&}"&b=@c}},Date{M=11},"} a"'.match(valRe),
				["2",'{i[]={a="{,^|&}"&b=@c}}', 'Date{M=11}', '"} a"'])
			assert.end()
		})
		.test("it should throw on invalid filter", function(assert) {
			var invalid = [
				'<5',
				'i"d',
				'i\\d',
				'id!',
				'id!=,',
				'id=,',
				'id=1|id=,',
				'id()',
				'!id()',
				'id()=1',
				'id(1)',
				'id(1)=1',
				'id.a()',
				'id.a(1)',
				'id.a()=a',
				'id.a(a)=a',
				'id=a()',
				'id=a.b()',
				'!id!',
				'!id!=1',
				'!id!1',
				'!id=1',
				'!id=!1',
				'!id[]!=1',
				'!id[]>1',
				'!id[]<1',
				'!'
			]
			, i = 0
			, len = invalid.length

			for (; i<len; i++) {
				assert.throws(function() {
					console.log(invalid[i], json.matcher(invalid[i]))
					for (var m; m = json.matcher.re.exec(invalid[i]); ) {
						console.log(m)
					}
				}, "throws on " + invalid[i])
			}
			assert.end()
		})

		.it ( "should translate query string to javascript", function(assert) {
			assert

			.equal(filterStr("id",{},[]), "(o=d)&&o['id']")
			.equal(filterStr("id=1,2",{},[]), "(o=d)&&(o['id']==a[0]||o['id']==a[1])")
			.equal(filterStr("id=1,2&name=test",{},[]), "(o=d)&&(o['id']==a[0]||o['id']==a[1])&&(o=d)&&(o['name']==a[2])")

			.equal(filterStr("id=1|id=2",{},[]), "(o=d)&&(o['id']==a[0])||(o=d)&&(o['id']==a[1])")

			.equal(filterStr("id[]",{},[]), "(o=d)&&i(o['id'])")
			.equal(filterStr("id[]&$select=ab",{},[]), "(o=d)&&i(o['id'])")
			.equal(filterStr("id[]&$select=ab",null,[]), "(o=d)&&i(o['id'])")
			.equal(filterStr("id[]=2",{},[]), "(o=d)&&i(o['id'])&&(I(o['id'],a[1](a[0])))")
			.equal(filterStr('id[]="2"',{},[]), "(o=d)&&i(o['id'])&&(I(o['id'],a[1](a[0])))")
			.equal(filterStr('id[]>2',{},[]), "(o=d)&&i(o['id'])&&(I(o['id'],a[1](a[0])))")
			.end()
		})
	})
})

//it("should be V8 friendly").
//isOptimized(json.pointer, [{}, "/a/b/c"]).
//isOptimized(json.mergePatch, [{a:1}, {b:2}]).
//isOptimized(json.clone, [{a:1}]).
//isOptimized(json.merge, [{a:1}, {b:2}]).
//isOptimized(json.isObject, [{a:1}]).
//isOptimized(json.isObject, ["a"]).




