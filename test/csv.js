


describe.it("should encode and decode csv", function(assert) {
	var csv = require("../csv")
	, i = 0
	, data = [
		{ab:"cd", ef:'g"h', i: ","},
		{ab:"CD"},
		{ab:1, ef: null, i:"J"},
		{ab: "", ef: "GH"}
	]
	, opts1 = {
		br: "\r\n",
		fields: "ab,ef,i",
		NULL: null,
		result: 'cd,"g""h",","\r\nCD,,\r\n1,,J\r\n,GH,'
	}
	, opts2 = {
		br: "\r\n",
		header: "present",
		result: 'ab,ef,i\r\ncd,"g""h",","\r\nCD,,\r\n1,,J\r\n,GH,'
	}
	, opts2f = {
		br: "\r\n",
		header: "present",
		fields: "Ab,Ef,I",
		result: 'Ab,Ef,I\r\ncd,"g""h",","\r\nCD,,\r\n1,,J\r\n,GH,'
	}
	, opts3 = {
		re: /^$|\D/,
		br: "),\n(",
		NULL: "NULL",
		prefix: "INSERT INTO table VALUES (",
		postfix: ");",
		result: 'INSERT INTO table VALUES ("cd","g""h",","),\n("CD",NULL,NULL),\n(1,NULL,"J"),\n("","GH",NULL);'
	}
	, opts4 = {
		prefix: '<Worksheet ss:Name="Sheet1"><Table><Row><Cell><Data ss:Type="String">',
		delimiter: '</Data></Cell><Cell><Data ss:Type="String">',
		br: '</Data></Cell></Row><Row><Cell><Data ss:Type="String">',
		postfix: '</Row></Table></Worksheet>',
		re: /</,
		esc: /</g,
		escVal: "&lt;",
		NULL: "",
		result: '<Worksheet ss:Name="Sheet1"><Table><Row><Cell><Data ss:Type="String">cd</Data></Cell><Cell><Data ss:Type="String">g"h</Data></Cell><Cell><Data ss:Type="String">,</Data></Cell></Row><Row><Cell><Data ss:Type="String">CD</Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell></Row><Row><Cell><Data ss:Type="String">1</Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String">J</Data></Cell></Row><Row><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String">GH</Data></Cell><Cell><Data ss:Type="String"></Row></Table></Worksheet>'
	}

	assert.equal(csv.encode(data, opts1), opts1.result)
	//assert.equal(csv.decode(opts1.result, opts1), data)
	assert.equal(csv.encode(data, opts2), opts2.result)
	assert.equal(csv.encode(data, opts2f), opts2f.result)
	assert.equal(csv.encode(data, opts3), opts3.result)
	assert.equal(csv.encode(data, opts4), opts4.result)

	assert.equal(csv.encode({ab:"cd", ef:"gh"}, opts1), "cd,gh")

	assert.equal(csv.encode({ab:"cd", ef:"gh"}, Object.assign({select:"ab"}, opts1)), "cd")

	assert.equal(csv.decode("1,2,3\n4,5,6", {}), [["1", "2", "3"], ["4", "5", "6"]])
	assert.equal(csv.decode("1,2,3\n4,5,6", {fields:"a,b,c"}), [{a:"1", b:"2", c:"3"}, {a:"4", b:"5", c:"6"}])
	assert.equal(csv.decode("a,b,c\n1,2,3\n4,5,6", {header:"present"}), [{a:"1", b:"2", c:"3"}, {a:"4", b:"5", c:"6"}])
	assert.equal(
		csv.decode('"1997",Ford,E350,"Super, ""luxurious"" truck"\r\n"1998",Ford,E350,"Super, ""luxurious"" truck"', {head: false}),
		[["1997","Ford","E350",'Super, "luxurious" truck'], ["1998","Ford","E350",'Super, "luxurious" truck']]
	)

	assert.equal(csv.encode([{arr:["a","b"]}]), "a;b")
	assert.equal(csv.decode("a,b,c\n1,2,3"), [["a","b","c"],["1","2","3"]])
	assert.equal(csv.decode("a,b,c\n1,2,3\n", {header:"present"}), [{"a":"1","b":"2","c":"3"}])
	assert.equal(
		csv.decode("a,b,c\n", {fields:"A,B,C"}),
		[{"A":"a","B":"b","C":"c"}]
	)

	assert.end()
})





