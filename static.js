

var path = require("path")


module.exports = function createStatic(_root, _opts) {
	var root = path.resolve(_root)
	, opts = Object.assign({
		index: "index.html",
		maxAge: 31536000, // One year
		rangeSize: 500 * 1024,
		cacheControl: {
			"cache.manifest": 0,
			"worker.js": 0
		}
	}, _opts)

	if (opts.cacheControl) {
		Object.each(opts.cacheControl, resolveFile, opts.cacheControl = {})
	}

	if (opts.headers) {
		Object.each(opts.headers, resolveFile, opts.headers = {})
	}

	return function(req, res, next) {
		var file
		, method = req.method

		if (method !== "GET" && method !== "HEAD") {
			res.setHeader("Allow", "GET, HEAD")
			return res.sendStatus(405) // Method not allowed
		}

		if (req.url === "/" && !opts.index) {
			return res.sendStatus(404)
		}

		try {
			file = path.resolve(root, (
				req.url === "/" ?
				opts.index :
				"." + decodeURIComponent(req.url.split("?")[0].replace(/\+/g, " "))
			))
		} catch (e) {
			return res.sendStatus(400)
		}

		if (file.slice(0, root.length) !== root) {
			return res.sendStatus(404)
		}
		res.sendFile(file, opts, function(err) {
			if (err && (err.name === "EISDIR" || err.name === "ERANGE" )) {
				res.sendStatus(err.code)
			} else {
				next()
			}
		})
	}

	function resolveFile(val, file) {
		this[file === "*" ? file : path.resolve(root, file)] = val
	}
}




/*

300 Multiple Choices
--------------------
// https://www.w3.org/Style/Examples/007/figures.h

The document name you requested (/Style/Examples/007/figures.) could not be found on this server. However, we found documents with names similar to the one you requested.
Available documents:
 - /Style/Examples/007/figures.it.html.redirect (common basename)

Please consider informing the owner of the __referring page__ about the broken link.

 - It is possible to communicate the list using a set of Link header fields [RFC5988],
   each with a relationship of "alternate".
 - https://tools.ietf.org/html/rfc2295 Transparent Content Negotiation in HTTP
   https://tools.ietf.org/html/draft-ietf-http-alternates-01
   Alternates: {"http://x.org/paper.1" 0.9 {type text/html} {language en}}, {"http://x.org/paper.2" 0.7 {type text/html} {language fr}}


406 Not Acceptable
------------------

It is not what anyone would expect, but if you're sure:
you can for example use a custom header like Accept-confirm: confirm-delete, and return 406 Not Acceptable if the Accept-confirm header is not what you expect.


This is done through the following code:

<a href="javascript:void(0);"
 onclick="document.execCommand('SaveAs',true,'file.html');"
  >Save this page</a> 

  However, usually you want to save another file, the file a hyperlink leads to. To do that javascript is not enough (at least there is no such standard way) and something must be done on the server.
  Forcing SaveAs using the HTTP header

  In order to force the browser to show SaveAs dialog when clicking a hyperlink you have to include the following header in HTTP response of the file to be downloaded: 

  Content-Disposition: attachment; filename="<file name.ext>" 

  Where <file name.ext> is the filename you want to appear in SaveAs dialog (like finances.xls or mortgage.pdf) - without < and > symbols. 

  You have to keep the following in mind:

  The filename should be in US-ASCII charset and shouldn't contain special characters: < > \ " / : | ? * space.
  The filename should not have any directory path information specified.
  The filename should be enclosed in double quotes but most browsers will support file names without double quotes.
  Ancient browsers also required the following (not needed nowadays, but for a fool proof solution might be worth doing):

  Content-Type header should be before Content-Disposition.
  Content-Type header should refer to an unknown MIME type (at least until the older browsers go away).



Try downloading files with Content-disposition

Try the header support in your browser, click here:

Text file with Content-Type of application/x-unknown.

*/




