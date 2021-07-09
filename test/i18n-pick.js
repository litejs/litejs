
describe(".pick()", function() {
	var i18n = require("../i18n.js").i18n

	this
	.should("pick", function(assert) {
		i18n.use("en")
		i18n.add("en", {
			They: "They;male=He;female=She"
		})
		assert
		.equal(i18n.pick(11, "low;30=med;60="), "low")
		.equal(i18n.pick(31, "low,30=med,60="), "med")
		.equal(i18n.pick(60, "low,30,med,60,,"), "")
		.equal(i18n.pick(61, "low;30=med;60="), "")
		.equal(i18n.pick(62, "low;30=med;60"), "")
		.equal(i18n.pick("", "low;30=med;;"), "low")
		.equal(i18n.pick("male", "They;male=He;female=She"), "He")
		.equal(i18n.pick("other", "They;male=He;female=She"), "They")
		.equal(i18n("{sex;?They} was", {sex:"male"}), "He was")
		// shorthand
		.equal(i18n.pick("is-green", "na;is-red?is-green?"), "is-green")
		assert.end()
	})
})

