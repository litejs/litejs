


describe("i18n", function() {
	var mod = require("../i18n.js")
	, i18n = mod.i18n
	, it = describe.it

	it("should define languages", function(assert) {
		assert.equal(i18n.current, null)

		i18n.def({
			"et": "Eesti keeles",
			"ar": "Arabic",
			"en": "In English",
			"fr-CH": "French (Switzerland)",
			"pl": "Po polsku"
		})

		assert.equal(i18n.current, "et")
		.equal(i18n.list, ["et", "ar", "en", "fr-CH", "pl"])
		.end()
	})

	it("should get translation by key", function(assert) {
		i18n.use("en")
		i18n.add("en", {
			page: {
				title: "Title"
			},
			hide: "Hide",
			save: "Save",
			user: {
				"": "User",
				"*": "one user;# users",
				"?": "A # user;pro=Pro user",
				"save": "Save User"
			}
		})

		assert
		.equal(i18n("page"), "page")
		.equal(i18n("page.save"), "Save")
		.equal(i18n("page.title"), "Title")
		.equal(i18n("save"), "Save")
		.equal(i18n("unknown.save"), "Save")
		.equal(i18n("unknown.txt"), "txt")

		.equal(i18n("user"), "User")                                 // Resolve "" key in map
		.equal(i18n("user.save"), "Save User")                       // Resolve nested key
		.equal(i18n("user.hide"), "Hide")                            // Fallback to root translation
		.equal(i18n("user.none"), "none")                            // Remove namespace
		.equal(i18n("{level;?user}", {level:"pro"}), "Pro user")     // Pick a value
		.equal(i18n("{level;?user}", {level:"new"}), "A new user")   // Pick and replace value
		.equal(i18n("{count;*user}", {count:0}), "0 users")          // Plural
		.equal(i18n("{count;*user}", {count:1}), "one user")
		.equal(i18n("{count;*user}", {count:2}), "2 users")
		.end()
	})

	it("should detect language", function(assert, mock) {

		assert.equal(i18n.detect(), "et")
		// i18n.detect
		mock.swap(global, "Intl", null)
		mod.navigator = {language: "et-EE"}
		assert.equal(i18n.detect(), "et")
		mod.navigator = {languages: ["zh-CN", "en-US", "ja-JP"]}
		assert.equal(i18n.detect(), "en")
		assert.equal(i18n.current, "en")
		mod.navigator = {userLanguage: "et"}
		assert.equal(i18n.detect(), "et")
		mod.navigator = {userLanguage: "ru"}
		assert.equal(i18n.detect("et-EE"), "et")
		assert.equal(i18n.detect("eq"), "et")
		assert.end()
	})

	it("should format", function(assert, mock) {

		i18n.vals.abc = "A B"

		i18n.add("et", {
			_: {
				num: "#1;-",
				num1: "#0,1;-"
			},
			ordinal: '"."',
			Home: "Ko'du",
			Name: "Nimi",
			replace: "{pre}Ni'mi {name;upcase},\n{deep.map.toUpperCase() + xx} vanus {age;#1}{unit} {3+1}",
			list: "{arr;map:'{name;map};{val}'}",
			button: {
				Name: "Nupu nimi",
				save: "Salvesta"
			},
			"a.Name": "Nimi A"
		})
		i18n.add("en", {
			ordinal: "th;st;nd;rd;o[n%=100]||o[(n-20)%10]||o[0]"
		})

		i18n.add("fr-ch", {
			ordinal: "ème;er;o[n==1?1:0]",
			num: "#'###,01"
		})

		assert.equal(i18n.current, "et")
		assert.equal(i18n("Name"), "Nimi")
		assert.equal(i18n(3), "3")
		assert.equal(i18n("{;name}"), "{name}")
		assert.equal(i18n("a.Name"), "Nimi A")
		assert.equal(i18n("b.Name"), "Nimi")
		assert.equal(i18n(["b.Name","a.Name"]), "Nimi")
		assert.equal(i18n("button"), "button")
		assert.equal(i18n("button.Name"), "Nupu nimi")
		assert.equal(i18n("button.Home"), "Ko'du")
		assert.equal(i18n("replace", {name:"Foo", age:10.1, deep:{map:"bar"}}), "Ni'mi FOO,\nBAR vanus 10 4")
		assert.equal(i18n("list", {arr: [{name:"a",val:1},{name:"b",val:2}]}), "a;1, b;2")
		assert.equal(i18n("{a;map:'{$}',', ',', and '}", {a: ["Key", "Foo", "Bar"]}), "Key, Foo, and Bar")
		assert.equal(i18n("{val;_.num}C {val;_.num1}K", {val:12.3}), "12C 12,3K")

		assert.equal(i18n("{lo;upcase}", { lo: "loCase" }), "LOCASE")
		assert.equal(i18n("{lo;upcase}", { lo: 10 }), "10")
		assert.equal(i18n("{lo;upcase}", { lo: null }), "")
		assert.equal(i18n("{up;locase}", { up: "UPCASE" }), "upcase")
		assert.equal(i18n("{up;locase}", { up: 20 }), "20")
		assert.equal(i18n("{up;locase}", { up: void 0 }), "")
		assert.equal(i18n("{arr[0]}", { arr: ["A"] }), "A")
		assert.equal(i18n("{arr[0].x}", { arr: [{x:"B"}] }), "B")
		assert.equal(i18n("{arr[0].toLocaleString()}", { arr: ["C"] }), "C")
		assert.equal(i18n("{arr[0].toLocaleString();locase}", { arr: ["C"] }), "c")
		assert.equal(i18n("{abc}"), "A B")
		assert.equal(i18n("{abc}", {}), "A B")
		assert.equal(i18n("{abc}", {abc: "A C"}), "A C")
		assert.equal(i18n("{$abc}"), "A B")
		assert.equal(i18n("{$abc}", {}), "A B")
		assert.equal(i18n("{$abc}", {abc: "A C"}), "A B")
		assert.end()
	})

	it("should format map", function(assert, mock) {
		assert.equal(i18n('{{a:1+2};json}'), '{"a":3}')
		assert.equal(i18n('{[1+2,"2"];json}'), '[3,"2"]')
		assert.equal(i18n('{[{a:1+2},"2"];json}'), '[{"a":3},"2"]')
		assert.equal(i18n('{[{a:1+2},"2"];json:}'), '[{"a":3},"2"]')
		assert.equal(i18n('{[{a:1+2},"2"];json:null}'), '[{"a":3},"2"]')
		assert.equal(i18n('{[{a:1+2},"2"];json:null,1}'), '[\n {\n  "a": 3\n },\n "2"\n]')
		assert.end()
	})


	require("./i18n-date.js")
	require("./i18n-number.js")
	require("./i18n-pick.js")
	require("./i18n-plural.js")
})


