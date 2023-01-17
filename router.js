
var defaultOpts = {
	method: {
		"DELETE": "del",
		"GET": "get",
		"PATCH": "patch",
		"POST": "post",
		"PUT": "put"
	}
}
, event = require("./event.js")
, util = require("./util.js")

module.exports = createRouter
createRouter.Router = Router

function createRouter(opts) {
	var methods = {}
	opts = router.opts = util.deepAssign({defaults: defaultOpts}, defaultOpts, opts)

	event.asEmitter(router)

	Object.keys(opts.method).forEach(function(method) {
		router[opts.method[method]] = use.bind(null, method)
	})

	router.use = use

	return router

	function router(req, res, next) {
		var params = req.params || (req.params = {})
		, match = methods[req.method] && methods[req.method].route(req.url, params)
		if (match) match(req, res, next)
		else next()
	}

	function use(method, route, fn) {
		;(methods[method] || (methods[method] = Router())).add(route, fn)
		return router
	}
}

function Router() {
	var fns = []
	, fnStr = ""
	, reStr = ""
	, escapeRe = /[.*+?^=!:${}()|\[\]\/\\]/g
	, routeRe = /\{([\w%.]+?)\}|.[^{\\]*?/g
	, routeSeq = 1
	, router = {
		add: function(route, fn) {
			fnStr += "m[" + (routeSeq++) + "]?("
			reStr += "|(" + route.replace(routeRe, function(_, expr) {
				return expr ?
					(fnStr += "p['" + expr + "']=m[" + (routeSeq++) + "],") && "([^/]+?)" :
					_.replace(escapeRe, "\\$&")
			}) + ")"
			fnStr += "f[" + (fns.push(fn) - 1) + "]):"
			router.route = buildAndRoute
		},
		route: buildAndRoute
	}
	return router

	function buildAndRoute(url, params, next) {
		router.route = Function(
			"f",
			"var r=/^\\/?(?:" + reStr + ")[\\/\\s]*$/;" +
			"return function(u,p,d){var m=r.exec(u||'');return m!==null?(" + fnStr + "d):d}"
		)(fns)
		return router.route(url, params, next)
	}
}

