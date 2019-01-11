var ctx = {};

function HTMLPP(){
    this.compile = function(file){
        var client = new XMLHttpRequest();
        client.open('GET', file, false);
        client.send();
        return this._buildTree(client.responseText);
    }

    this._buildTree = function(text){
        ctx = this._importDataAndImportTags(text);
        text = this._removeDataAndImportTags(text);
        text = this._parseDefineTags(text);

        // loop through all top-level if, foreach and print tags and parse them
        var regex = new RegExp(
                "<(print)\\s*>([\\s\\S]*?)</print\\s*>|"
                + "<(foreach)\\s+([a-zA-Z_$][\\w$]*)\\s+in\\s+([a-zA-Z_$][\\w$]*)\\s*>"
                + "([\\s\\S]*?)</foreach\\s*>|"
                + "<(if)\\s+cond\\s*=\\s*\(['\"])(.*?)\\8\\s*>([\\s\\S]*?)</if\\s*>");

        var match;
        var root = new SequenceNode(ctx, false, null);

        while(match = regex.exec(text)){
            if(match[1] == "print"){
                root.push(new HTMLNode(text.substring(0,match.index), false, root),
                        new PrintNode(match[2], true, root));
                text = text.slice(match.index + match[0].length);
            } else if(match[3] == "foreach"){
                root.push(new HTMLNode(text.substring(0,match.index)),
                        this._parseForeachNode(match[4], match[5], match[6], ctx));
                text = text.slice(match.index + match[0].length);
            } else if(match[7] == "if"){
                root.push(new HTMLNode(text.substring(0,match.index)),
                        this._parseIfNode(match[9], match[10], ctx));
                text = text.slice(match.index + match[0].length);
            }
        }
        if(text)
            root.push(new HTMLNode(text));
        return root;
    }

    // returns parsed text
    this._parseDefineTags = function(text){
        // make a list of all defined tags
        var defineRegex = /<define\s+([a-zA-Z_$][\w$-]*)\s*((?:[a-zA-Z_$][\w$]*\s*)*)>([\s\S]*?)<\/define\s*>/ 
            var match;
        var definedTags = [];
        while(match = defineRegex.exec(text)){
            // try to convert the arguments into a list, otherwise empty list
            try{ match[2] = match[2].trim();
                 if(match[2])
                     match[2] = match[2].split(/\s/); }
            catch(e){ match[2] = []; }
            definedTags.push({
                name: match[1], 
                params: match[2],
                body: match[3]});
            // delete the define tag from the text
            text = text.replace(match[0], "");
        }

        // string-replace nested defined tags
        for(var i in definedTags){
            var tagNameRegex = '<' + definedTags[i].name;
            var paramsRegex = "";
            for(var j in definedTags[i].params){
                paramsRegex += "\\s+(.+?)";
            }
            var regex = new RegExp(tagNameRegex + paramsRegex + '\\s*>', 'g');
            for(var tag in definedTags){
                while(match = regex.exec(definedTags[tag].body)){
                    var body = definedTags[i].body;
                    for(var j=1; j <= definedTags[i].params.length; j++){
                        var expr = match[j];
                        var param = definedTags[i].params[j-1];
                        body = body.replace(param, expr);
                    }
                    definedTags[tag].body = definedTags[tag].body.replace(match[0], body);
                }
            }
        }

        // string-replace each instance of the defined tags in the text
        for(var i in definedTags){
            var tagNameRegex = '<' + definedTags[i].name;
            var paramsRegex = "";
            for(var j in definedTags[i].params){
                paramsRegex += "\\s+(.+?)";
            }
            var regex = new RegExp(tagNameRegex + paramsRegex + '\\s*>', 'g');
            while(match = regex.exec(text)){
                var body = definedTags[i].body;
                for(var j=1; j <= definedTags[i].params.length; j++){
                    var expr = match[j];
                    var param = definedTags[i].params[j-1];
                    body = body.replace(param, expr);
                }
                text = text.replace(match[0], body);
            }
        }
        return text;
    }

    // parses all json data in data tags and returns an object with that data
    this._importDataAndImportTags = function(text){
        var data = {};

        // parse data tags
        var dataRegex = /<data\s*>([\s\S]*?)<\/data\s*>/g;
        var match;
        while(match = dataRegex.exec(text)){
            var newData;
            try{ newData = JSON.parse(match[1]); }
            catch(e){ newData = {}; }
            for(var key in newData){
                data[key] = newData[key];
            }
        }

        // parse import tags
        var importRegex = /<import\s+src\s*=\s*"(.*?)"\s*\/?>/g;
        while(match = importRegex.exec(text)){ 
            var newData;
            // do an http request on the data source and parse it
            try{
                var client = new XMLHttpRequest();
                client.open('GET', match[1], false);
                client.send();
                newData = JSON.parse(client.responseText);
            }catch(e){ newData = {}; }
            for(var key in newData){
                data[key] = newData[key];
            }
        }

        return data;
    }

    this._removeDataAndImportTags = function(text){
        var regex = /<data\s*>([\s\S]*?)<\/data\s*>|<import\s+src\s*=\s*"(.*?)"\s*\/?>|<import\s+doc\s*=\s*"(.*?)"\s*\/?>/;
        var match;
        while(match = regex.exec(text)){
            text = text.replace(match[0], '');
        }
        return text;
    }

    this._parseForeachNode = function(variable, collection, body, ctx){
        // find either the next opening if/foreach/print tag, or closing foreach tag
        var regex = /(<print|<if|<foreach)/;
        var match;
        var node = new SequenceNode();
        while(match = regex.exec(body)){
            switch(match[1]){
                case "<print":
                    node.push(new HTMLNode(body.substring(0,match.index)));
                    var printRegex = /<print\s*>([\s\S]*?)<\/print\s*>/;
                    match = printRegex.exec(body);
                    node.push(new PrintNode(match[1]));
                    body = body.slice(match.index + match[0].length);
                    break;
                case "<if":
                    node.push(new HTMLNode(body.substring(0,match.index)));
                    var ifRegex = /<if\s+cond\s*=\s*(['"])(.*?)\1\s*>([\s\S]*?)<\/if\s*>/;
                    match = ifRegex.exec(body);
                    node.push(this._parseIfNode(match[2], match[3], ctx));
                    body = body.slice(match.index + match[0].length);
                    break;
                case "<foreach":
                    node.push(new HTMLNode(body.substring(0,match.index)));
                    var foreachRegex = /<foreach\s+([a-zA-Z_$][\w$]*)\s+in\s+([a-zA-Z_$][\w$]*)\s*>([\s\S]*?)<\/foreach\s*>/;
                    match = foreachRegex.exec(body);
                    node.push(this._parseForeachNode(match[1], match[2], match[3], ctx));
                    body = body.slice(match.index + match[0].length);
                    break;
            }
        }
        node.push(new HTMLNode(body));
        return new ForeachNode(variable, collection, node);
    }

    this._parseIfNode = function(cond, body){
        // find either the next opening if/foreach/print tag
        var regex = /<(print|if|foreach|else|elseif)\s*>/;
        var match;
        var ifNode = new SequenceNode();
        var elseNode = new SequenceNode();
        while(match = regex.exec(body)){
            if(match[1] == "print"){
                ifNode.push(new HTMLNode(body.substring(0,match.index)));
                var printRegex = /<print\s*>([\s\S]*?)<\/print\s*>/;
                match = printRegex.exec(body);
                ifNode.push(new PrintNode(match[1]));
                body = body.slice(match.index + match[0].length);
            } else if (match[1] == 'if') {
                ifNode.push(new HTMLNode(body.substring(0,match.index)));
                var ifRegex = /<if\s+cond\s*=\s*(['"])(.*?)\1\s*>([\s\S]*?)<\/if\s*>/;
                match = ifRegex.exec(body);
                ifNode.push(this._parseIfNode(match[2], match[3], ctx));
                body = body.slice(match.index + match[0].length);
            } else if (match[1] == 'foreach'){
                ifNode.push(new HTMLNode(body.substring(0,match.index)));
                var foreachRegex = /<foreach\s+([a-zA-Z_$][\w$]*)\s+in\s+([a-zA-Z_$][\w$]*)\s*>([\s\S]*?)<\/foreach\s*>/;
                match = foreachRegex.exec(body);
                ifNode.push(this._parseForeachNode(match[1], match[2], match[3], ctx));
                body = body.slice(match.index + match[0].length);
            } else if (match[1] == 'elseif'){
                ifNode.push(new HTMLNode(body.substring(0,match.index)));
                var elseifRegex = /<elseif\s+cond\s*=\s*(['"])(.*?)\1\s*>(.*)<(else|$)/;
                match = elseifRegex.exec(body);
                elseNode.push(this._parseIfNode(match[2], match[3], ctx));
                body = ""
            } else if (match[1] == 'else'){
                ifNode.push(new HTMLNode(body.substring(0,match.index)));
                var elseRegex = /<else\s*>/;
                match = elseRegex.exec(body);
                body = body.slice(match.index + match[0].length);
                var regex = /<(print|if|foreach)\s*>/;
                var match;
                while(match = regex.exec(body)){
                    switch(match[1]){
                        case "print":
                            elseNode.push(new HTMLNode(body.substring(0,match.index)));
                            var printRegex = /<print\s*>([\s\S]*?)<\/print\s*>/;
                            match = printRegex.exec(body);
                            elseNode.push(new PrintNode(match[1]));
                            body = body.slice(match.index + match[0].length);
                            break;
                        case "if":
                            elseNode.push(new HTMLNode(body.substring(0,match.index)));
                            var ifRegex = /<if\s+cond\s*=\s*(['"])(.*?)\1\s*>([\s\S]*?)<\/if\s*>/;
                            match = ifRegex.exec(body);
                            elseNode.push(this._parseIfNode(match[2], match[3], ctx));
                            body = body.slice(match.index + match[0].length);
                            break;
                        case "foreach":
                            elseNode.push(new HTMLNode(body.substring(0,match.index)));
                            var foreachRegex = /<foreach\s+([a-zA-Z_$][\w$]*)\s+in\s+([a-zA-Z_$][\w$]*)\s*>([\s\S]*?)<\/foreach\s*>/;
                            match = foreachRegex.exec(body);
                            elseNode.push(this._parseForeachNode(match[1], match[2], match[3], ctx));
                            body = body.slice(match.index + match[0].length);
                            break;
                    }
                }
                if(body) {
                    elseNode.push(new HTMLNode(body));
                    body = "";
                }
            }
        }
        if(body)
            ifNode.push(new HTMLNode(body));
        return new IfElseNode(cond, ifNode, elseNode);
    }

}
htmlpp = new HTMLPP();

var uniqueID = 1;

class ASTNode {
    constructor(type, create = true) {
		this.type = type;
		this.id = uniqueID++;
		if (create) {
			this.span = document.createElement(`span`);
			this.span.id = `${this.type}${this.id}`;
		}
	}

	compile (parent = undefined) {
		if (parent && parent.span && this.span)
			parent.span.appendChild(this.span);
	}

	update (propagate = false, ctx = {}) {
		var result = this.execute(ctx);
		if (propagate && this.span)
			return result;
		else if (this.span)
			document.getElementById(`${this.type}${this.id}`).innerHTML = result;
		else
			return result;
	}

	execute (ctx) {
		alert("Programmer fail: ASTNode.execute was called");
	}
	
	evaluate (expr, ctx) {
		var params = Object.keys(ctx);
        var args = [];
        for(var key in params){
            args.push("ctx." + params[key]);
        }

        params = params.join();
		args = args.join();
        var f = "(function(" + params + "){" +
				"try{ return " + expr + "}catch(e){}})(" + args + ");";
		return f;
	}
}

class SequenceNode extends ASTNode {
	constructor(ctx = undefined, create = true) {
		super("Sequence", create);
		this.nodes = [];
		this.ctx = ctx;
	}

	compile (parent = undefined) {
		var res = "";
		for(var i in this.nodes) {
			var x = this.nodes[i].compile(this);
			if (x) res += x;
		}

		super.compile(parent);
		return res;
	}

	execute (ctx) {
		var context;
		if (this.ctx)
			context = this.ctx;
		else
			context = ctx;

		var res = "";
		for(var i in this.nodes) {
			var x = this.nodes[i].update(this.id !== 1, context);
			if (x) res += x;
		}
		return res;
	}

	push () {
        for(var i in arguments)
            this.nodes.push(arguments[i]);
	}
}

class HTMLNode extends ASTNode {
	constructor(text, create = false) {
		super("HTML", false, create);
		this.text = text;
	}

	compile (parent = undefined) {
		return this.text;
	}

	execute (ctx) {
		return this.text;
	}
}

class PrintNode extends ASTNode {
	constructor(expr, create = true, parent = null) {
		super("Print", create, parent);
		this.expr = expr;
	}

	compile (parent = undefined) {
		super.compile(parent);
		return this.span.outerHTML;
	}

	execute (ctx) {
        // wrap the expression in a function that takes the context keys as params
        // and call it with the context values as arguments
		var f = super.evaluate(this.expr, ctx);
		return String(eval(f));
	}
}

class IfElseNode extends ASTNode {
	constructor(cond, ifBody, elseBody, create = true, parent = null) {
		super("IfElse", create, parent);
		this.cond = cond;
		this.ifBody = ifBody;
		this.elseBody = elseBody;
	}

	compile(parent = undefined) {
		super.compile(parent);
		this.ifBody.compile(this);
		this.elseBody.compile(this);	
		return this.span.outerHTML;
	}

	execute(ctx) {
		var f = super.evaluate(this.cond, ctx);
		if(eval(f)) {
			return this.ifBody.update(true, ctx);
		} else {
			return this.elseBody.update(true, ctx);
		}
	}
}

class ForeachNode extends ASTNode {
	constructor(varName, collection, body, create = true, parent = null) {
		super("Foreach", create, parent);
		this.varName = varName;
		this.collection = collection;
		this.body = body;
	}

	compile(parent = undefined) {
		super.compile(parent);
		return this.span.outerHTML;
	}

	execute(ctx) {
		var result = "";
		for (var elt in ctx[this.collection]) {
			// body.context[varName] = context[collection][elt]
			var extended = ctx;
			extended[this.varName] = extended[this.collection][elt];
			result += this.body.update(true, extended);
		}
		return result;
	}
}

