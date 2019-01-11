# README #

HTML++ is a library that extends HTML to add several useful tags, to allow for creating interactive front-end webpages without any programming languages, in a syntax similar to HTML.

HTML++ is a strict superset of HTML, meaning you can write HTML code around and in HTML++ code. You can even have an HTML++ webpage that is only HMTL.

This library was made as a final project for CSE401 at the University of Washington by [Jeremy Thunell](https://github.com/jrthunell) and Adam Geller.

## Tutorial ##
First, copy the index.html, index.htmlpp, and htmlpp.js files into a new directory. Don't make any changes to index.html or htmlpp.js (unless you know what you are doing).
All your code will go in index.htmlpp or other htmlpp files you create. Take a look in the examples folder for examples of HTML++ code.

HTML++ adds six tags on top of vanilla HTML:

- `<define my-element [var1. var2, …]>`

	This element allows the user to create template elements composed of other html tags. For example, 
	
	```
	<define my-title name>
		<h1>My name is <print>name</print></h1>
	</define>
	```
	
	would define a new element, `<my-title>`, which would be used like `<my-title name=”Ras”>`
- `<foreach element in data>`

	The foreach tag allows the user to iterate over items in a collection, like a standard foreach loop in most programming languages. It allows the user to iterate over all the items in a collection. For example, `<foreach movie in movies><li><print movie></li></foreach>` Would print every element in the data object movies.
- `<if cond="condition"><elseif cond="condition"><else>...</if>`

	This element allows the user to add control flow to their HTML. For example:
	```
	<data>{name:“Ras”}</data>
	<if name==”Chris”>...
	<elseif name==”Bill”>...
	<else>...
	</if>
	```
	This works dynamically, so as the data changes, the branches of the if-statement will change accordingly.
- `<data [name="..."]>{...}</data> or <import src=”...” [name="..."]/>`

	The data and import tags both import JSON-formatted data to be used by the `foreach` and `if` tags.
	
	The `<data>` tag parses JSON data between the tags. For example, `<data>{"myData":"foo"}</data>` would create a variable called myData with the value "foo".
	
	The `<import>` tag works the same way, but loads the JSON from an external source, specified in the src attribute. For example, `<import src="myData.json" />` would import the JSON-formatted data in the myData.json file.
- `<print var>`

	This directly prints the given variable into the HTML at the specified location. For example: `<data>{name:”Ras”}</data><h1><print name></h1>` would render in the browser as `<h1>Ras</h1>`. Note that this works by injecting a `<span>` element, so it doesn't work for things like setting the title of the page.

A few notes:
* HTML++ does not play nicely with tables (because they are old). But that's ok because floats and lists are newer and better.
* HTML++ uses JavaScript's XMLHttpRequest to fetch files. This can fail on local files sometimes. If you are having issues, hosting the files on a server will usually fix this. For development, I recommend downloading python and using `python -m http.server 8000`. Now you can open `localhost:8000` in a browser and see your website!
* Data imported into HTML with the `<data>` or `<import>` tags is all stored in a javascript object called `ctx`. So if you want to interact with the data in JavaScript, you can use `ctx.myData`. For example `<data>{"title":"My Title"}</data>` would be stored in `ctx.title`.