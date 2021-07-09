
describe(".number()", function() {
	var i18n = require("../i18n.js").i18n

	this
	.should("format numbers", function(assert) {
		i18n.add("et", {
			"#": {
				temp: "+1°C;-°C;-#°C",
				temp1: "+0,1°C;-°C;-#°C"
			}
		})
		i18n.use("et")
		// format;NaN;negFormat;0;Infinity;-Infinity;roundPoint
		assert.equal(
			i18n("{p;#temp} {p;#temp1} {u;#temp} {n;#temp} {n;#temp1}", {p: 12.35, n: -12.35}),
			"+12°C +12,4°C -°C -12°C -12,4°C"
		)
		assert.equal(
			i18n("{a;#5} {b;#5} {c;#5} {d;#5} {e;#5} {f;#5}", {a: 6, b: 4, c: 1, d: -1, e: -4, f: -6}),
			"5 5 0 0 -5 -5"
		)
		assert.equal(
			i18n("{a;#1} {b;#1} {a;#1;-} {b;#1;-} {a;#1;;;;∞} {b;#1;;;;;-lot's} {c;#1;;;ZERO}", {a: Infinity, b: -Infinity, c: 0}),
			"- - - - ∞ -lot's ZERO"
		)

		assert
		.equal(i18n.number(12, "#temp"), "+12°C")
		.equal(i18n.number(0, "#.01"), ".00")
		.equal(i18n.number(0.00000000000000001, "#.01"), ".00")
		.equal(i18n.number(-0.00000000000000001, "#.01"), ".00")
		.equal(i18n.number(9007199254740990, "#.01"), "9007199254740990.00")
		.equal(i18n.number(-9007199254740990, "#.01"), "-9007199254740990.00")
		.equal(i18n.number(0, "#.01;-"), ".00")
		.equal(i18n.number(NaN, "#.05"), "-")
		.equal(i18n.number(NaN, "#.05;𝄪"), "𝄪")
		.equal(i18n.number(null, "#.05"), "-")
		.equal(i18n.number(null, "#.05;⚠"), "⚠")
		.equal(i18n.number(void 0, "#.05"), "-")
		.equal(i18n.number(void 0, "#.05;-"), "-")
		.equal(i18n.number(.34, "#,###.05"), ".35")
		.equal(i18n.number(.34, "+1"), "+0")
		.equal(i18n.number(.34, "1+"), "0+")
		.equal(i18n.number(1.34, "+1"), "+1")
		.equal(i18n.number(-1.34, "+1"), "-1")
		.equal(i18n.number(-1.34, "1+;;#-"), "1-")
		.equal(i18n("{.34;#,###.05}"), ".35")
		.equal(i18n.number(1234.34,  "$ #,###.05 ;;($#)"), "$ 1,234.35 ")
		.equal(i18n.number(-1234.34, "$ #,###.05 ;;($#)"), "($1,234.35)")
		.equal(i18n.number(-1234.34, "#,###.05 ;;(#)"), "(1,234.35)")
		.equal(i18n.number(-1234.34, "#,###.05 ;;#-"), "1,234.35-")
		.equal(i18n.number(.34, "#,###.05 ;;(#)"), ".35 ")
		.equal(i18n.number(.36, "#,##0.05"), "0.35")
		.equal(i18n.number(.31, "#,#00.05"), "00.30")
		.equal(i18n.number(1.005, "0.01"), "1.01")
		// roundPoint
		.equal(i18n.number(1.005, "0.01;;;;;;.1"), "1.00")
		.equal(i18n.number(1.005, "0.01;;;;;;.5"), "1.01")
		.equal(i18n.number(1.005, "0.01;;;;;;1"), "1.01")
		.equal(i18n.number(1.005, "#.01"), "1.01")
		.equal(i18n.number(9, "#10"), "10")
		.equal(i18n.number(-9, "#10"), "-10")
		.equal(i18n.number(30000.65, "# ##0,01"), "30 000,65")
		.equal(i18n.number(9007199254740990, "# ##1"), "9 007 199 254 740 990")
		.equal(i18n.number(123567890, "#,###,##,##2"), "1,235,67,890")
		.equal(i18n.number(123567890, "#,####,###1"), "1,2356,7890")
		.equal(i18n.number(123567890, "#,###_##'##2.00"), "1,235_67'890.00")
		.equal(i18n.number(23567890, "#,###,##,##2.00"), "235,67,890.00")
		.equal(i18n.number(3567890, "#,###,##,##2.00"), "35,67,890.00")
		.equal(i18n.number(567890, "#,###,##,##2.00"), "5,67,890.00")
		.equal(i18n.number(67890, "#,###,##,##2.00"), "67,890.00")
		.equal(i18n.number(7890, "#,###,##,##2.00"), "7,890.00")
		.equal(i18n.number(890, "#,###,##,##2.00"), "890.00")
		.equal(i18n.number(90, "#,###,##,##2.00"), "90.00")

		.equal(i18n.number(1235.123, "00,005.00"), "01,235.00")
		assert.end()
	})

	.should("format fractions", function(assert) {
		assert
		.equal(i18n.number(.70, "#.25"), ".75")
		.equal(i18n.number(.10, "#/4"), "0")
		.equal(i18n.number(.20, "#/4"), "¼")
		.equal(i18n.number(.20, "0/4"), "0¼")
		.equal(i18n.number(.30, "#/4"), "¼")
		.equal(i18n.number(.40, "#/4"), "½")
		.equal(i18n.number(.50, "#/4"), "½")
		.equal(i18n.number(.60, "#/4"), "½")
		.equal(i18n.number(.70, "#/4"), "¾")
		.equal(i18n.number(.80, "#/4"), "¾")
		.equal(i18n.number(.90, "#/4"), "1")
		.equal(i18n.number(1.0, "#/4"), "1")
		.equal(i18n.number(1.1, "#/4"), "1")
		.equal(i18n.number(1.2, "#/4"), "1¼")
		.equal(i18n.number(.70, "#/8", 1), "¾")

		.equal(i18n.number(1.05, "#/5"), "1")
		.equal(i18n.number(1.15, "#/5"), "1⅕")
		.equal(i18n.number(1.25, "#/5"), "1⅕")
		.equal(i18n.number(1.4,  "#/5"), "1⅖")
		.equal(i18n.number(1.6,  "#/5"), "1⅗")
		.equal(i18n.number(1.8,  "#/5"), "1⅘")

		assert.end()
	})

	.should("format abbreviations", function(assert) {
		var d = {
			a: 1, b: 12, c: 123, d: 1234, e: 12345, f: 123456,
			g: 1.2, h: 1.23, i: 1.234, j: 12.3456, k: 0.123456, l: 0.0123456
		}
		assert
		.equal(i18n("{a;#1a} {b;#1a} {c;#1a} {d;#1a} {e;#1a} {f;#1a}", d), "1 12 123 1k 12k 123k")
		.equal(i18n("{g;#1a} {h;#1a} {i;#1a} {j;#1a} {k;#1a} {l;#1a}", d), "1 1 1 12 0 0")

		.equal(i18n("{a;#0,1a} {b;#0,1a} {c;#0,1a} {d;#0,1a} {e;#0,1a} {f;#0,1a}", d), "1,0 12,0 123,0 1,2k 12,3k 123,5k")
		.equal(i18n("{g;#0.1a} {h;#0.1a} {i;#0.1a} {j;#0.1a} {k;#0.1a} {l;#0.1a}", d), "1.2 1.2 1.2 12.3 0.1 0.0")

		.equal(i18n("{a;#0,01a} {b;#0,01a} {c;#0,01a} {d;#0,01a} {e;#0,01a} {f;#0,01a}", d), "1,00 12,00 123,00 1,23k 12,35k 123,46k")
		.equal(i18n("{g;#0.01a} {h;#0.01a} {i;#0.01a} {j;#0.01a} {k;#0.01a} {l;#0.01a}", d), "1.20 1.23 1.23 12.35 0.12 0.01")

		.equal(i18n("{a;#1a1} {b;#1a1} {c;#1a1} {d;#1a1} {e;#1a1} {f;#1a1}", d), "1 10 100 1k 10k 100k")
		.equal(i18n("{a;#1a2} {b;#1a2} {c;#1a2} {d;#1a2} {e;#1a2} {f;#1a2}", d), "1 12 120 1k 12k 120k")
		.equal(i18n("{a;#1a3} {b;#1a3} {c;#1a3} {d;#1a3} {e;#1a3} {f;#1a3}", d), "1 12 123 1k 12k 123k")
		.equal(i18n("{a;#1a4} {b;#1a4} {c;#1a4} {d;#1a4} {e;#1a4} {f;#1a4}", d), "1 12 123 1k 12k 123k")
		.equal(i18n("{a;#1a5} {b;#1a5} {c;#1a5} {d;#1a5} {e;#1a5} {f;#1a5}", d), "1 12 123 1k 12k 123k")

		.equal(i18n("{a;#0,1a3} {b;#0,1a3} {c;#0,1a3} {d;#0,1a3} {e;#0,1a3} {f;#0,1a3}", d), "1 12 123 1,2k 12,3k 124k")
		.equal(i18n("{a;#0,1a4} {b;#0,1a4} {c;#0,1a4} {d;#0,1a4} {e;#0,1a4} {f;#0,1a4}", d), "1 12 123 1,2k 12,3k 123,5k")
		.equal(i18n("{a;#0,1a5} {b;#0,1a5} {c;#0,1a5} {d;#0,1a5} {e;#0,1a5} {f;#0,1a5}", d), "1 12 123 1,2k 12,3k 123,5k")

		.equal(i18n("{a;#0,01a4} {b;#0,01a4} {c;#0,01a4} {d;#0,01a4} {e;#0,01a4} {f;#0,01a4}", d), "1 12 123 1,23k 12,35k 123,5k")
		.equal(i18n("{g;#0,01a4} {h;#0,01a4} {i;#0,01a4} {j;#0,01a4} {k;#0,01a4} {l;#0,01a4}", d), "1,2 1,23 1,23 12,35 0,12 0,01")

		.equal(i18n.number(1234567, "1a"), "1M")
		.equal(i18n.number(123456.789, "#0,1 a5W"), "123,5 kW")
		.equal(i18n.number(123456.789, "#0,1a5W"), "123,5kW")
		.equal(i18n.number(123456.789, "#0,01 a5W"), "123,46 kW")
		.equal(i18n.number(123456.789, "#0,1 a6W"), "123,5 kW")
		.equal(i18n.number(123456.789, "#/4 a6W"), "123½ kW")
		.equal(i18n.number(1234567.89, "#0,1 a6W"), "1,2 MW")
		.equal(i18n.number(12345678.9, "#0,1 a6W"), "12,3 MW")
		.equal(i18n.number(123456789, "#0,1 a6W"), "123,5 MW")
		.equal(i18n.number(1234567890, "#0,1 a6W"), "1,2 GW")
		.equal(i18n.number(12345678901, "#0,1 a6W"), "12,3 GW")
		.equal(i18n.number(123456789012, "#0,1 a6W"), "123,5 GW")
		.equal(i18n.number(1234567890123, "#0,1 a6W"), "1,2 TW")
		.equal(i18n.number(1234567890123456, "#0,1 a6W"), "1,2 PW")
		.equal(i18n.number(1234567890123456789, "#0,1 a6W"), "1,2 EW")
		assert.end()
	})

	.should("format ordinal", function(assert) {
		function assertOrdinal(i) {
			assert.equal(i18n.number(parseInt(i), "1o"), i)
		}

		assert.equal(i18n.detect("et"), "et")
		;[ "0.", "1.", "2.", "3.", "101."].forEach(assertOrdinal)

		assert.equal(i18n.detect("en"), "en")
		;[
			"0th", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th",
			"10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th",
			"20th", "21st", "22nd", "23rd", "24th", "25th", "26th", "27th", "28th", "29th",
			"90th", "91st", "92nd", "93rd", "94th", "95th", "96th", "97th", "98th", "99th",
			"100th", "101st", "102nd", "103rd", "104th", "105th", "106th", "107th", "108th", "109th",
			"110th", "111th", "112th", "113th", "114th"
		].forEach(assertOrdinal)

		assert.equal(i18n.detect("fr-CH"), "fr-ch")
		;[ "1er", "2ème"].forEach(assertOrdinal)

		assert.end()
	})
})

/*
// List of SI prefixes
yotta  Y   1000⁸     10²⁴    1000000000000000000000000    septillion      quadrillion    1991
zetta  Z   1000⁷     10²¹    1000000000000000000000       sextillion      trilliard      1991
exa    E   1000⁶     10¹⁸    1000000000000000000          quintillion     trillion       1975
peta   P   1000⁵     10¹⁵    1000000000000000             quadrillion     billiard       1975
tera   T   1000⁴     10¹²    1000000000000                trillion        billion        1960
giga   G   1000³     10⁹     1000000000                   billion         milliard       1960
mega   M   1000²     10⁶     1000000                      million                        1873
kilo   k   1000¹     10³     1000                         thousand                       1795
hecto  h   100       10²     100                          hundred                        1795
deca   da  10        10¹     10                           ten                            1795
	   1         10⁰     1                            one                            –
deci   d   10⁻¹      10⁻1    0.1                          tenth                          1795
centi  c   100⁻¹     10⁻2    0.01                         hundredth                      1795
milli  m   1000⁻¹    10⁻3    0.001                        thousandth                     1795
micro  µ   1000⁻²    10⁻6    0.000001                     millionth                      1873
nano   n   1000⁻³    10⁻9    0.000000001                  billionth       milliardth     1960
pico   p   1000⁻⁴    10⁻12   0.000000000001               trillionth      billionth      1960
femto  f   1000⁻⁵    10⁻15   0.000000000000001            quadrillionth   billiardth     1964
atto   a   1000⁻⁶    10⁻18   0.000000000000000001         quintillionth   trillionth     1964
zepto  z   1000⁻⁷    10⁻21   0.000000000000000000001      sextillionth    trilliardth    1991
yocto  y   1000⁻⁸    10⁻24   0.000000000000000000000001   septillionth    quadrillionth  1991
*/

