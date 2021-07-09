
describe(".plural()", function() {
	var i18n = require("../i18n.js").i18n

	this
	.should("format plurals", function(assert) {
		i18n.add("pl-1", {
			"*": {
				"": "n==0||n==1?n:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?2:3",
				"file": "zero plików;1 plik;# pliki;# plików"
			},
			"book": "Zero książek;Jedna książka;# książki;# książek"
		})
		i18n.add("pl-2", {
			"*": "n==1?0:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?1:2",
			"file": "plik",
			"*file": "1 plik;# pliki;# plików"
		})
		i18n.add("pl-3", {
			"*": "n==1?0:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?1:2",
			"file": {
				"": "plik",
				"*": "1 plik;# pliki;# plików"
			}
		})
		i18n.add("uk", {
			"#": {
				"1": "# ##0,1"
			},
			"*": "n%1?3:n%10==1&&n%100!=11?0:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?1:2",
			"day": {
				"*": "1 день;# дні;# днів;# дня"
			}
		})

		i18n.use("pl-1")
		assert
		.equal(i18n.plural(1, "file"), "1 plik")
		.equal(i18n.plural(2, "file"), "2 pliki")
		.equal(i18n.plural(4, "file"), "4 pliki")
		.equal(i18n.plural(5, "file"), "5 plików")
		.equal(i18n("{1;*file} {2;*file}"), "1 plik 2 pliki")
		.equal(i18n("{1;*book} {2;*book} {5;*book} {22;*book}"), "Jedna książka 2 książki 5 książek 22 książki")

		i18n.use("pl-2")
		assert
		// "*file" replaced before reaching to extension
		//.equal(i18n("{1;*file} {2;*file}"), "1 plik 2 pliki")

		i18n.use("pl-3")
		assert
		.equal(i18n("file"), "plik")
		.equal(i18n("{1;*file} {2;*file}"), "1 plik 2 pliki")

		i18n.use("uk")
		assert
		.equal(i18n("{1;*day} {2;*day} {5;*day} {1.3;*day} {2.3;*day} {5.3;*day}"), "1 день 2 дні 5 днів 1.3 дня 2.3 дня 5.3 дня")

		assert.end()
	})
})

