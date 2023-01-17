
this.router = function() {
	var escapeRe = /[.*+?^=!:${}()|[\]/\\]/g
	, parseRe = /\{([\w%.]+?)\}|.[^{\\]*?/g
	, group = 1
	, fnStr = ""
	, reStr = ""
	, router = {
		add: function(route) {
			var params = "m[" + (router.seq = group++) + "]?("
			reStr += "|(" + route.replace(parseRe, function(_, key) {
				return key ? (params += "o['" + key + "']=m[" + (group++) + "],") && "([^/]+?)" : _.replace(escapeRe, "\\$&")
			}) + ")"
			fnStr += params + "'" + route + "'):"
			router.route = buildAndRoute
			return router
		},
		build: function() {
			return Function(
				"var r=/^\\/?(?:" + reStr + ")[\\/\\s]*$/;" +
				"return function(u,o,d){var m=r.exec(u||'');return m!==null?(" + fnStr + "d):d}"
			)
		},
		route: buildAndRoute
	}
	return router
	function buildAndRoute(url, params) {
		router.route = router.build()()
		return router.route(url, params)
	}
}

