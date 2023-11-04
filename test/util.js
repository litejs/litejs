
var it = describe.it




describe("util", function() {
	var util = require("../util")

	it ("should have deepAssign", function(assert) {
		function B(){}
		B.prototype.parent = 1
		var a = {
			a: null,
			b: {},
			c: {cc:2},
			d: 1,
			e: "",
			f: "ab",
			A: {},
			B: {},
			C: {},
			D: {},
			E: {},
			F: {}
		}
		, b = Object.assign(new B, {
			a: {aa:1},
			b: {bb:2},
			c: {ccc:3},
			d: {dd:{ddd:4}},
			e: {ee:5},
			f: {ff:6},
			A: null,
			B: false,
			C: "",
			D: 0,
			E: 1,
			F: "ab"
		})
		, c = {
			a: {aa:1},
			b: {bb:2},
			c: {cc:2,ccc:3},
			d: {dd:{ddd:4}},
			e: {ee:5},
			f: {ff:6},
			B: false,
			C: "",
			D: 0,
			E: 1,
			F: "ab"
		}
		util.deepAssign(a, null, b)

		assert.equal(a, c)
		assert.equal(b.parent, 1)

		util.deepAssign({}, JSON.parse('{"__proto__": {"isAdmin": true}}'))
		assert.notOk({}.isAdmin)

		assert.end()
	})

	it ("should convert ip", function(assert) {
		function compare(a, b, c) {
			if (typeof b === "string") b = Buffer.from(b, "hex")
			assert.equal(util.ip2buf(a), b)
			assert.equal(util.buf2ip(b), c || a)
		}
		assert
		.equal(util.ip2int("0.0.0.0"), 0)
		.equal(util.ip2int("0.0.0.1"), 1)
		.equal(util.int2ip(1), "0.0.0.1")
		.equal(util.int2ip(0), "0.0.0.0")

		compare("0.1.2.3.4", "00010203", "0.1.2.3")
		compare("127.0.0.1", "7f000001")
		compare("ffff::255.255.255.255", "ffffffff", "255.255.255.255")
		compare("2001:0000:1234:0000:0000:c1c0:abcd:0876", "20010000123400000000C1C0ABCD0876")
		compare("2001:0000:1234::c1c0:abcd:0876", "20010000123400000000C1C0ABCD0876", "2001:0000:1234:0000:0000:c1c0:abcd:0876")
		compare("2001::c1c0:abcd:0876", "20010000000000000000C1C0ABCD0876", "2001:0000:0000:0000:0000:c1c0:abcd:0876")

		assert.end()
	})

	it ("should test in range", function(assert) {
		assert
		.equal(util.ipInNet("0.0.0.0", "0.0.0.0/30"), true)
		.equal(util.ipInNet("0.0.0.1", "0.0.0.0/30"), true)
		.equal(util.ipInNet("0.0.0.2", "0.0.0.0/30"), true)
		.equal(util.ipInNet("0.0.0.3", "0.0.0.0/30"), true)
		.equal(util.ipInNet("0.0.0.4", "0.0.0.0/30"), false)

		.equal(util.ipInNet("0.0.0.4", "10.1.2.3/24"), false)

		.equal(util.ipInNet("192.168.99.255", "192.168.100.0/22"), false)
		.equal(util.ipInNet("192.168.100.0", "192.168.100.0/22"), true)
		.equal(util.ipInNet("192.168.100.0", "192.168.100"), true)
		.equal(util.ipInNet("192.168.103.255", "192.168.100.0/22"), true)
		.equal(util.ipInNet("192.168.104.0", "192.168.100.0/22"), false)

		.equal(util.ipInNet("0.0.0.0", "0.0.0.0/255.255.255.252"), true)
		.equal(util.ipInNet("0.0.0.1", "0.0.0.0/255.255.255.252"), true)
		.equal(util.ipInNet("0.0.0.2", "0.0.0.0/255.255.255.252"), true)
		.equal(util.ipInNet("0.0.0.3", "0.0.0.0/255.255.255.252"), true)
		.equal(util.ipInNet("0.0.0.4", "0.0.0.0/255.255.255.252"), false)
		.end()
	})

	it ("should match domain regex", function(assert) {
		var pass = [
			"example.co.uk",
			"example-co.uk",
			"example.com"
		]
		, fail = [
			"example..com",
			".example.com",
			"example.com.",
			"-xample.com",
			"exampl-.com"
		]

		pass.forEach(function(name) {
			assert.ok(util.domainRe.test(name), name + " should match")
		})
		fail.forEach(function(name) {
			assert.notOk(util.domainRe.test(name), name + " should match")
		})
		assert.end()
	})
	it ("should test ip addresses with Re", function(assert) {
		// http://jsfiddle.net/AJEzQ/
		var v4pass = [
			"0.0.0.0",
			"1.2.3.4",
			"12.123.234.240",
			"248.249.250.251",
			"252.253.254.255"
		]
		, v4fail = [
			"", "1", "12", "123", "1.2", "1.2.3",
			".", ".1", ".12", ".123", ".1.2", ".1.2.3",
			"..", "1.", "12.", "123.", "1.2.", "1.2.3.",
			".1.2.3.4", "1..2.3.4", "1.2..3.4", "1.2.3..4", "1.2.3.4.",
			"256.1.1.1", "1.256.1.1", "1.1.256.1", "1.1.1.256",
			"1.257.1.1", "1.258.1.1", "1.259.1.1", "1.260.1.1", "1.261.1.1",
			"01.2.3.4", "1.02.3.4", "1.2.03.4", "1.2.3.04",
			"012.2.3.4", "1.023.3.4", "1.2.034.4", "1.2.3.045",
			"١.1.1.1",
			"0.0.0.0."
		]
		, v6pass = [
			//"mydomain.com",
			//"test.mydomain.com",
			//"123.23.34.2",
			//"172.26.168.134"
			//"fe80::4413:c8ae:2821:5852%10"
			//"fe80::217:f2ff:254.7.237.98",
			//"::ffff:192.168.1.1",
			//"::ffff:192.168.1.26",
			//"::ffff:192.168.1.26",
			//"1:2:3:4:5:6:1.2.3.4",
			//"1:2:3:4:5::1.2.3.4",
			//"1:2:3:4::1.2.3.4",
			//"1:2:3::1.2.3.4",
			//"1:2::1.2.3.4",
			//"1::1.2.3.4",
			//"1:2:3:4::5:1.2.3.4",
			//"1:2:3::5:1.2.3.4",
			//"1:2::5:1.2.3.4",
			//"1::5:1.2.3.4",
			//"1::5:11.22.33.44",
			"2001:0000:1234:0000:0000:C1C0:ABCD:0876",
			"2001:0:1234::C1C0:ABCD:876",
			"3ffe:0b00:0000:0000:0001:0000:0000:000a",
			"3ffe:b00::1:0:0:a",
			"FF02:0000:0000:0000:0000:0000:0000:0001",
			"FF02::1" ,
			"0000:0000:0000:0000:0000:0000:0000:0001",
			"0000:0000:0000:0000:0000:0000:0000:0000",
			"2001:0000:1234:0000:0000:C1C0:ABCD:0876",
			"2001:0:1234::C1C0:ABCD:876",
			"2001:0000:1234:0000:0000:C1C0:ABCD:0876",
			"2001:0:1234::C1C0:ABCD:876",
			"2::10",
			"ff02::1",
			"fe80::",
			"2002::",
			"2001:db8::",
			"2001:db8:1234::",
			"1:2:3:4:5:6:7:8", "1:2:3:4:5:6::8", "1:2:3:4:5::8", "1:2:3:4::8", "1:2:3::8", "1:2::8", "1::8",
			"1::2:3:4:5:6:7", "1::2:3:4:5:6", "1::2:3:4:5", "1::2:3:4", "1::2:3", "1::8",
			"1:2:3:4:5:6::", "1:2:3:4:5::", "1:2:3:4::", "1:2:3::", "1:2::", "1::",
			"1:2:3:4:5::7:8", "1:2:3:4::7:8", "1:2:3::7:8", "1:2::7:8", "1::7:8",
			"::2:3:4:5:6:7:8", "::2:3:4:5:6:7", "::2:3:4:5:6", "::2:3:4:5", "::2:3:4", "::2:3", "::8",
			"fe80::217:f2ff:fe07:ed62",
			"2001:DB8:0:0:8:800:200C:417A",
			"FF01:0:0:0:0:0:0:101",
			"FF01::101",
			"0:0:0:0:0:0:0:1",
			"0:0:0:0:0:0:0:0",
			"2001:2:3:4:5:6:7:134"
		]
		, v6fail = [
			"",
			"---",
			"2001:0db8:1234::",
			"02001:0000:1234:0000:0000:C1C0:ABCD:0876",
			"2001:0000:1234:0000:00001:C1C0:ABCD:0876",
			" 2001:0000:1234:0000:0000:C1C0:ABCD:0876  0",
			"2001:0000:1234: 0000:0000:C1C0:ABCD:0876",
			"2001:1:1:1:1:1:255Z255X255Y255",
			"3ffe:0b00:0000:0001:0000:0000:000a",
			"FF02:0000:0000:0000:0000:0000:0000:0000:0001",
			"3ffe:b00::1::a",
			"::1111:2222:3333:4444:5555:6666::",
			"1:2:3::4:5::7:8",
			"12345::6:7:8",
			"1::5:400.2.3.4",
			"1::5:260.2.3.4",
			"1::5:256.2.3.4",
			"1::5:1.256.3.4",
			"1::5:1.2.256.4",
			"1::5:1.2.3.256",
			"1::5:300.2.3.4",
			"1::5:1.300.3.4",
			"1::5:1.2.300.4",
			"1::5:1.2.3.300",
			"1::5:900.2.3.4",
			"1::5:1.900.3.4",
			"1::5:1.2.900.4",
			"1::5:1.2.3.900",
			"1::5:300.300.300.300",
			"1::5:3000.30.30.30",
			"1::400.2.3.4",
			"1::260.2.3.4",
			"1::256.2.3.4",
			"1::1.256.3.4",
			"1::1.2.256.4",
			"1::1.2.3.256",
			"1::300.2.3.4",
			"1::1.300.3.4",
			"1::1.2.300.4",
			"1::1.2.3.300",
			"1::900.2.3.4",
			"1::1.900.3.4",
			"1::1.2.900.4",
			"1::1.2.3.900",
			"1::300.300.300.300",
			"1::3000.30.30.30",
			"::400.2.3.4",
			"::260.2.3.4",
			"::256.2.3.4",
			"::1.256.3.4",
			"::1.2.256.4",
			"::1.2.3.256",
			"::300.2.3.4",
			"::1.300.3.4",
			"::1.2.300.4",
			"::1.2.3.300",
			"::900.2.3.4",
			"::1.900.3.4",
			"::1.2.900.4",
			"::1.2.3.900",
			"::300.300.300.300",
			"::3000.30.30.30"
		]

		v4pass.forEach(function(ip) {
			assert.ok(util.ipv4Re.test(ip), ip + " should match with ipv4Re")
			assert.notOk(util.ipv6Re.test(ip), ip + " should fail with ipv6Re")
		})
		v4fail.forEach(function(ip) {
			assert.notOk(util.ipv4Re.test(ip), ip + " should fail with ipv4Re")
			assert.notOk(util.ipv6Re.test(ip), ip + " should fail with ipv6Re")
		})
		v6pass.forEach(function(ip) {
			assert.ok(util.ipv6Re.test(ip), ip + " should match with ipv6Re")
			assert.notOk(util.ipv4Re.test(ip), ip + " should fail with ipv4Re")
		})
		v6fail.forEach(function(ip) {
			assert.notOk(util.ipv6Re.test(ip), ip + " should fail with ipv6Re")
			assert.notOk(util.ipv4Re.test(ip), ip + " should fail with ipv4Re")
		})

		assert.end()
	})
	it("should have uuid4/rand/round", function(assert, mock) {
		mock.rand(12345)
		assert
		.equal(util.uuid4().length, 36)
		.equal(util.rand(15), "9zgvprzwauak3nm")
		.equal(util.rand(-5, 5), -4.829521910247747)
		.equal(util.round(1.005, 2), 1.01)
		.notOk(util.nop())
		.end()
	})
	it("should resolve numbers", function(assert) {
		var X, arr = [
			0, X, X, 0,
			X, 0, X, 0,
			X, X, 0, 0,
			1, 0, 0, 1,
			123, X, X, 123,
			X, 123, X, 123,
			X, X, 123, 123,
			"1", X, X, 1,
			X, "1", X, 1,
			"1.", X, X, 1,
			"1.0", X, X, 1,
			"123", X, X, 123,
			"124 ", X, X, 124,
			"125k", X, X, 125*1000,
			"126 km", X, X, 126*1000,
			"127kiB", X, X, 127*1024,
			"128 ki", X, X, 128*1024,
			"2M", X, X,  2*1000*1000,
			"3Mi", X, X, 3*1024*1024,
			"4G", X, X,  4*1000*1000*1000,
			"5Gi", X, X, 5*1024*1024*1024,
			"6T", X, X,  6*1000*1000*1000*1000,
			"7Ti", X, X, 7*1024*1024*1024*1024,
			"8P", X, X,  8*1000*1000*1000*1000*1000,
			"9Pi", X, X, 9*1024*1024*1024*1024*1024,
			"1 sec", X, X, 1000,
			"2min", X, X, 120000,
			"3 hr", X, X, 10800000,
			"4 days", X, X, 345600000,
			"5weeks", X, X, 3024000000,
			"6 months", X, X, 15778454400,
			"7 years", X, X, 220898361600
		]
		, i = 0
		, l = arr.length
		for (; i < l; ) {
			assert.equal(util.num(arr[i++], arr[i++], arr[i++]), arr[i++])
		}
		assert.end()
	})
	it("should have wait", function(assert) {
		assert.plan(4)

		assert.throws(function() {
			util.wait()
		})

		var resume = util.wait(assert.notOk.bind(assert))
		, resume1 = util.wait(assert.notOk.bind(assert), 1)
		, resume3 = util.wait(assert.ok.bind(assert), 5)

		setTimeout(resume.wait(), 1)
		setTimeout(resume.wait(), 1)

		resume1.wait(0)()
		resume1()

		resume3.wait(0)("Err")
	})
})

