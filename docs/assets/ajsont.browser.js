//#region src/types.ts
var e = Symbol("MISSING"), t = class {
	add(e, t, n) {
		if (typeof arguments[0] != "string") for (let e in arguments[0]) this.add(e, arguments[0][e], arguments[1]);
		else (Array.isArray(e) ? e : [e]).forEach(function(e) {
			this[e] = this[e] || [], t && this[e][n ? "unshift" : "push"](t);
		}, this);
	}
	run(e, t) {
		this[e] = this[e] || [], this[e].forEach(function(e) {
			e.call(t && t.context ? t.context : t, t);
		});
	}
}, n = class {
	constructor(e) {
		this.jsep = e, this.registered = {};
	}
	register() {
		[...arguments].forEach((e) => {
			if (typeof e != "object" || !e.name || !e.init) throw Error("Invalid JSEP plugin format");
			this.registered[e.name] || (e.init(this.jsep), this.registered[e.name] = e);
		});
	}
}, r = class e {
	static get version() {
		return "1.4.0";
	}
	static toString() {
		return "JavaScript Expression Parser (JSEP) v" + e.version;
	}
	static addUnaryOp(t) {
		return e.max_unop_len = Math.max(t.length, e.max_unop_len), e.unary_ops[t] = 1, e;
	}
	static addBinaryOp(t, n, r) {
		return e.max_binop_len = Math.max(t.length, e.max_binop_len), e.binary_ops[t] = n, r ? e.right_associative.add(t) : e.right_associative.delete(t), e;
	}
	static addIdentifierChar(t) {
		return e.additional_identifier_chars.add(t), e;
	}
	static addLiteral(t, n) {
		return e.literals[t] = n, e;
	}
	static removeUnaryOp(t) {
		return delete e.unary_ops[t], t.length === e.max_unop_len && (e.max_unop_len = e.getMaxKeyLen(e.unary_ops)), e;
	}
	static removeAllUnaryOps() {
		return e.unary_ops = {}, e.max_unop_len = 0, e;
	}
	static removeIdentifierChar(t) {
		return e.additional_identifier_chars.delete(t), e;
	}
	static removeBinaryOp(t) {
		return delete e.binary_ops[t], t.length === e.max_binop_len && (e.max_binop_len = e.getMaxKeyLen(e.binary_ops)), e.right_associative.delete(t), e;
	}
	static removeAllBinaryOps() {
		return e.binary_ops = {}, e.max_binop_len = 0, e;
	}
	static removeLiteral(t) {
		return delete e.literals[t], e;
	}
	static removeAllLiterals() {
		return e.literals = {}, e;
	}
	get char() {
		return this.expr.charAt(this.index);
	}
	get code() {
		return this.expr.charCodeAt(this.index);
	}
	constructor(e) {
		this.expr = e, this.index = 0;
	}
	static parse(t) {
		return new e(t).parse();
	}
	static getMaxKeyLen(e) {
		return Math.max(0, ...Object.keys(e).map((e) => e.length));
	}
	static isDecimalDigit(e) {
		return e >= 48 && e <= 57;
	}
	static binaryPrecedence(t) {
		return e.binary_ops[t] || 0;
	}
	static isIdentifierStart(t) {
		return t >= 65 && t <= 90 || t >= 97 && t <= 122 || t >= 128 && !e.binary_ops[String.fromCharCode(t)] || e.additional_identifier_chars.has(String.fromCharCode(t));
	}
	static isIdentifierPart(t) {
		return e.isIdentifierStart(t) || e.isDecimalDigit(t);
	}
	throwError(e) {
		let t = /* @__PURE__ */ Error(e + " at character " + this.index);
		throw t.index = this.index, t.description = e, t;
	}
	runHook(t, n) {
		if (e.hooks[t]) {
			let r = {
				context: this,
				node: n
			};
			return e.hooks.run(t, r), r.node;
		}
		return n;
	}
	searchHook(t) {
		if (e.hooks[t]) {
			let n = { context: this };
			return e.hooks[t].find(function(e) {
				return e.call(n.context, n), n.node;
			}), n.node;
		}
	}
	gobbleSpaces() {
		let t = this.code;
		for (; t === e.SPACE_CODE || t === e.TAB_CODE || t === e.LF_CODE || t === e.CR_CODE;) t = this.expr.charCodeAt(++this.index);
		this.runHook("gobble-spaces");
	}
	parse() {
		this.runHook("before-all");
		let t = this.gobbleExpressions(), n = t.length === 1 ? t[0] : {
			type: e.COMPOUND,
			body: t
		};
		return this.runHook("after-all", n);
	}
	gobbleExpressions(t) {
		let n = [], r, i;
		for (; this.index < this.expr.length;) if (r = this.code, r === e.SEMCOL_CODE || r === e.COMMA_CODE) this.index++;
		else if (i = this.gobbleExpression()) n.push(i);
		else if (this.index < this.expr.length) {
			if (r === t) break;
			this.throwError("Unexpected \"" + this.char + "\"");
		}
		return n;
	}
	gobbleExpression() {
		let e = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
		return this.gobbleSpaces(), this.runHook("after-expression", e);
	}
	gobbleBinaryOp() {
		this.gobbleSpaces();
		let t = this.expr.substr(this.index, e.max_binop_len), n = t.length;
		for (; n > 0;) {
			if (e.binary_ops.hasOwnProperty(t) && (!e.isIdentifierStart(this.code) || this.index + t.length < this.expr.length && !e.isIdentifierPart(this.expr.charCodeAt(this.index + t.length)))) return this.index += n, t;
			t = t.substr(0, --n);
		}
		return !1;
	}
	gobbleBinaryExpression() {
		let t, n, r, i, a, o, s, c, l;
		if (o = this.gobbleToken(), !o || (n = this.gobbleBinaryOp(), !n)) return o;
		for (a = {
			value: n,
			prec: e.binaryPrecedence(n),
			right_a: e.right_associative.has(n)
		}, s = this.gobbleToken(), s || this.throwError("Expected expression after " + n), i = [
			o,
			a,
			s
		]; n = this.gobbleBinaryOp();) {
			if (r = e.binaryPrecedence(n), r === 0) {
				this.index -= n.length;
				break;
			}
			a = {
				value: n,
				prec: r,
				right_a: e.right_associative.has(n)
			}, l = n;
			let c = (e) => a.right_a && e.right_a ? r > e.prec : r <= e.prec;
			for (; i.length > 2 && c(i[i.length - 2]);) s = i.pop(), n = i.pop().value, o = i.pop(), t = {
				type: e.BINARY_EXP,
				operator: n,
				left: o,
				right: s
			}, i.push(t);
			t = this.gobbleToken(), t || this.throwError("Expected expression after " + l), i.push(a, t);
		}
		for (c = i.length - 1, t = i[c]; c > 1;) t = {
			type: e.BINARY_EXP,
			operator: i[c - 1].value,
			left: i[c - 2],
			right: t
		}, c -= 2;
		return t;
	}
	gobbleToken() {
		let t, n, r, i;
		if (this.gobbleSpaces(), i = this.searchHook("gobble-token"), i) return this.runHook("after-token", i);
		if (t = this.code, e.isDecimalDigit(t) || t === e.PERIOD_CODE) return this.gobbleNumericLiteral();
		if (t === e.SQUOTE_CODE || t === e.DQUOTE_CODE) i = this.gobbleStringLiteral();
		else if (t === e.OBRACK_CODE) i = this.gobbleArray();
		else {
			for (n = this.expr.substr(this.index, e.max_unop_len), r = n.length; r > 0;) {
				if (e.unary_ops.hasOwnProperty(n) && (!e.isIdentifierStart(this.code) || this.index + n.length < this.expr.length && !e.isIdentifierPart(this.expr.charCodeAt(this.index + n.length)))) {
					this.index += r;
					let t = this.gobbleToken();
					return t || this.throwError("missing unaryOp argument"), this.runHook("after-token", {
						type: e.UNARY_EXP,
						operator: n,
						argument: t,
						prefix: !0
					});
				}
				n = n.substr(0, --r);
			}
			e.isIdentifierStart(t) ? (i = this.gobbleIdentifier(), e.literals.hasOwnProperty(i.name) ? i = {
				type: e.LITERAL,
				value: e.literals[i.name],
				raw: i.name
			} : i.name === e.this_str && (i = { type: e.THIS_EXP })) : t === e.OPAREN_CODE && (i = this.gobbleGroup());
		}
		return i ? (i = this.gobbleTokenProperty(i), this.runHook("after-token", i)) : this.runHook("after-token", !1);
	}
	gobbleTokenProperty(t) {
		this.gobbleSpaces();
		let n = this.code;
		for (; n === e.PERIOD_CODE || n === e.OBRACK_CODE || n === e.OPAREN_CODE || n === e.QUMARK_CODE;) {
			let r;
			if (n === e.QUMARK_CODE) {
				if (this.expr.charCodeAt(this.index + 1) !== e.PERIOD_CODE) break;
				r = !0, this.index += 2, this.gobbleSpaces(), n = this.code;
			}
			this.index++, n === e.OBRACK_CODE ? (t = {
				type: e.MEMBER_EXP,
				computed: !0,
				object: t,
				property: this.gobbleExpression()
			}, t.property || this.throwError("Unexpected \"" + this.char + "\""), this.gobbleSpaces(), n = this.code, n !== e.CBRACK_CODE && this.throwError("Unclosed ["), this.index++) : n === e.OPAREN_CODE ? t = {
				type: e.CALL_EXP,
				arguments: this.gobbleArguments(e.CPAREN_CODE),
				callee: t
			} : (n === e.PERIOD_CODE || r) && (r && this.index--, this.gobbleSpaces(), t = {
				type: e.MEMBER_EXP,
				computed: !1,
				object: t,
				property: this.gobbleIdentifier()
			}), r && (t.optional = !0), this.gobbleSpaces(), n = this.code;
		}
		return t;
	}
	gobbleNumericLiteral() {
		let t = "", n, r;
		for (; e.isDecimalDigit(this.code);) t += this.expr.charAt(this.index++);
		if (this.code === e.PERIOD_CODE) for (t += this.expr.charAt(this.index++); e.isDecimalDigit(this.code);) t += this.expr.charAt(this.index++);
		if (n = this.char, n === "e" || n === "E") {
			for (t += this.expr.charAt(this.index++), n = this.char, (n === "+" || n === "-") && (t += this.expr.charAt(this.index++)); e.isDecimalDigit(this.code);) t += this.expr.charAt(this.index++);
			e.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) || this.throwError("Expected exponent (" + t + this.char + ")");
		}
		return r = this.code, e.isIdentifierStart(r) ? this.throwError("Variable names cannot start with a number (" + t + this.char + ")") : (r === e.PERIOD_CODE || t.length === 1 && t.charCodeAt(0) === e.PERIOD_CODE) && this.throwError("Unexpected period"), {
			type: e.LITERAL,
			value: parseFloat(t),
			raw: t
		};
	}
	gobbleStringLiteral() {
		let t = "", n = this.index, r = this.expr.charAt(this.index++), i = !1;
		for (; this.index < this.expr.length;) {
			let e = this.expr.charAt(this.index++);
			if (e === r) {
				i = !0;
				break;
			} else if (e === "\\") switch (e = this.expr.charAt(this.index++), e) {
				case "n":
					t += "\n";
					break;
				case "r":
					t += "\r";
					break;
				case "t":
					t += "	";
					break;
				case "b":
					t += "\b";
					break;
				case "f":
					t += "\f";
					break;
				case "v":
					t += "\v";
					break;
				default: t += e;
			}
			else t += e;
		}
		return i || this.throwError("Unclosed quote after \"" + t + "\""), {
			type: e.LITERAL,
			value: t,
			raw: this.expr.substring(n, this.index)
		};
	}
	gobbleIdentifier() {
		let t = this.code, n = this.index;
		for (e.isIdentifierStart(t) ? this.index++ : this.throwError("Unexpected " + this.char); this.index < this.expr.length && (t = this.code, e.isIdentifierPart(t));) this.index++;
		return {
			type: e.IDENTIFIER,
			name: this.expr.slice(n, this.index)
		};
	}
	gobbleArguments(t) {
		let n = [], r = !1, i = 0;
		for (; this.index < this.expr.length;) {
			this.gobbleSpaces();
			let a = this.code;
			if (a === t) {
				r = !0, this.index++, t === e.CPAREN_CODE && i && i >= n.length && this.throwError("Unexpected token " + String.fromCharCode(t));
				break;
			} else if (a === e.COMMA_CODE) {
				if (this.index++, i++, i !== n.length) {
					if (t === e.CPAREN_CODE) this.throwError("Unexpected token ,");
					else if (t === e.CBRACK_CODE) for (let e = n.length; e < i; e++) n.push(null);
				}
			} else if (n.length !== i && i !== 0) this.throwError("Expected comma");
			else {
				let t = this.gobbleExpression();
				(!t || t.type === e.COMPOUND) && this.throwError("Expected comma"), n.push(t);
			}
		}
		return r || this.throwError("Expected " + String.fromCharCode(t)), n;
	}
	gobbleGroup() {
		this.index++;
		let t = this.gobbleExpressions(e.CPAREN_CODE);
		if (this.code === e.CPAREN_CODE) return this.index++, t.length === 1 ? t[0] : t.length ? {
			type: e.SEQUENCE_EXP,
			expressions: t
		} : !1;
		this.throwError("Unclosed (");
	}
	gobbleArray() {
		return this.index++, {
			type: e.ARRAY_EXP,
			elements: this.gobbleArguments(e.CBRACK_CODE)
		};
	}
}, i = new t();
Object.assign(r, {
	hooks: i,
	plugins: new n(r),
	COMPOUND: "Compound",
	SEQUENCE_EXP: "SequenceExpression",
	IDENTIFIER: "Identifier",
	MEMBER_EXP: "MemberExpression",
	LITERAL: "Literal",
	THIS_EXP: "ThisExpression",
	CALL_EXP: "CallExpression",
	UNARY_EXP: "UnaryExpression",
	BINARY_EXP: "BinaryExpression",
	ARRAY_EXP: "ArrayExpression",
	TAB_CODE: 9,
	LF_CODE: 10,
	CR_CODE: 13,
	SPACE_CODE: 32,
	PERIOD_CODE: 46,
	COMMA_CODE: 44,
	SQUOTE_CODE: 39,
	DQUOTE_CODE: 34,
	OPAREN_CODE: 40,
	CPAREN_CODE: 41,
	OBRACK_CODE: 91,
	CBRACK_CODE: 93,
	QUMARK_CODE: 63,
	SEMCOL_CODE: 59,
	COLON_CODE: 58,
	unary_ops: {
		"-": 1,
		"!": 1,
		"~": 1,
		"+": 1
	},
	binary_ops: {
		"||": 1,
		"??": 1,
		"&&": 2,
		"|": 3,
		"^": 4,
		"&": 5,
		"==": 6,
		"!=": 6,
		"===": 6,
		"!==": 6,
		"<": 7,
		">": 7,
		"<=": 7,
		">=": 7,
		"<<": 8,
		">>": 8,
		">>>": 8,
		"+": 9,
		"-": 9,
		"*": 10,
		"/": 10,
		"%": 10,
		"**": 11
	},
	right_associative: new Set(["**"]),
	additional_identifier_chars: new Set(["$", "_"]),
	literals: {
		true: !0,
		false: !1,
		null: null
	},
	this_str: "this"
}), r.max_unop_len = r.getMaxKeyLen(r.unary_ops), r.max_binop_len = r.getMaxKeyLen(r.binary_ops);
var a = (e) => new r(e).parse(), o = Object.getOwnPropertyNames(class {});
Object.getOwnPropertyNames(r).filter((e) => !o.includes(e) && a[e] === void 0).forEach((e) => {
	a[e] = r[e];
}), a.Jsep = r;
var s = "ConditionalExpression";
a.plugins.register({
	name: "ternary",
	init(e) {
		e.hooks.add("after-expression", function(t) {
			if (t.node && this.code === e.QUMARK_CODE) {
				this.index++;
				let n = t.node, r = this.gobbleExpression();
				if (r || this.throwError("Expected expression"), this.gobbleSpaces(), this.code === e.COLON_CODE) {
					this.index++;
					let i = this.gobbleExpression();
					if (i || this.throwError("Expected expression"), t.node = {
						type: s,
						test: n,
						consequent: r,
						alternate: i
					}, n.operator && e.binary_ops[n.operator] <= .9) {
						let r = n;
						for (; r.right.operator && e.binary_ops[r.right.operator] <= .9;) r = r.right;
						t.node.test = r.right, r.right = t.node, t.node = n;
					}
				} else this.throwError("Expected :");
			}
		});
	}
});
var c = 47, l = 92, u = {
	name: "regex",
	init(e) {
		e.hooks.add("gobble-token", function(t) {
			if (this.code === c) {
				let n = ++this.index, r = !1;
				for (; this.index < this.expr.length;) {
					if (this.code === c && !r) {
						let r = this.expr.slice(n, this.index), i = "";
						for (; ++this.index < this.expr.length;) {
							let e = this.code;
							if (e >= 97 && e <= 122 || e >= 65 && e <= 90 || e >= 48 && e <= 57) i += this.char;
							else break;
						}
						let a;
						try {
							a = new RegExp(r, i);
						} catch (e) {
							this.throwError(e.message);
						}
						return t.node = {
							type: e.LITERAL,
							value: a,
							raw: this.expr.slice(n - 1, this.index)
						}, t.node = this.gobbleTokenProperty(t.node), t.node;
					}
					this.code === e.OBRACK_CODE ? r = !0 : r && this.code === e.CBRACK_CODE && (r = !1), this.index += this.code === l ? 2 : 1;
				}
				this.throwError("Unclosed Regex");
			}
		});
	}
}, d = 43, f = {
	name: "assignment",
	assignmentOperators: new Set([
		"=",
		"*=",
		"**=",
		"/=",
		"%=",
		"+=",
		"-=",
		"<<=",
		">>=",
		">>>=",
		"&=",
		"^=",
		"|=",
		"||=",
		"&&=",
		"??="
	]),
	updateOperators: [d, 45],
	assignmentPrecedence: .9,
	init(e) {
		let t = [e.IDENTIFIER, e.MEMBER_EXP];
		f.assignmentOperators.forEach((t) => e.addBinaryOp(t, f.assignmentPrecedence, !0)), e.hooks.add("gobble-token", function(e) {
			let n = this.code;
			f.updateOperators.some((e) => e === n && e === this.expr.charCodeAt(this.index + 1)) && (this.index += 2, e.node = {
				type: "UpdateExpression",
				operator: n === d ? "++" : "--",
				argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
				prefix: !0
			}, (!e.node.argument || !t.includes(e.node.argument.type)) && this.throwError(`Unexpected ${e.node.operator}`));
		}), e.hooks.add("after-token", function(e) {
			if (e.node) {
				let n = this.code;
				f.updateOperators.some((e) => e === n && e === this.expr.charCodeAt(this.index + 1)) && (t.includes(e.node.type) || this.throwError(`Unexpected ${e.node.operator}`), this.index += 2, e.node = {
					type: "UpdateExpression",
					operator: n === d ? "++" : "--",
					argument: e.node,
					prefix: !1
				});
			}
		}), e.hooks.add("after-expression", function(e) {
			e.node && n(e.node);
		});
		function n(e) {
			f.assignmentOperators.has(e.operator) ? (e.type = "AssignmentExpression", n(e.left), n(e.right)) : e.operator || Object.values(e).forEach((e) => {
				e && typeof e == "object" && n(e);
			});
		}
	}
};
a.plugins.register(u, f), a.addUnaryOp("typeof"), a.addUnaryOp("void"), a.addLiteral("null", null), a.addLiteral("undefined", void 0);
var p = new Set([
	"constructor",
	"__proto__",
	"__defineGetter__",
	"__defineSetter__",
	"__lookupGetter__",
	"__lookupSetter__"
]), m = {
	evalAst(e, t) {
		switch (e.type) {
			case "BinaryExpression":
			case "LogicalExpression": return m.evalBinaryExpression(e, t);
			case "Compound": return m.evalCompound(e, t);
			case "ConditionalExpression": return m.evalConditionalExpression(e, t);
			case "Identifier": return m.evalIdentifier(e, t);
			case "Literal": return m.evalLiteral(e, t);
			case "MemberExpression": return m.evalMemberExpression(e, t);
			case "UnaryExpression": return m.evalUnaryExpression(e, t);
			case "ArrayExpression": return m.evalArrayExpression(e, t);
			case "CallExpression": return m.evalCallExpression(e, t);
			case "AssignmentExpression": return m.evalAssignmentExpression(e, t);
			default: throw SyntaxError("Unexpected expression", e);
		}
	},
	evalBinaryExpression(e, t) {
		return {
			"||": (e, t) => e || t(),
			"&&": (e, t) => e && t(),
			"|": (e, t) => e | t(),
			"^": (e, t) => e ^ t(),
			"&": (e, t) => e & t(),
			"==": (e, t) => e == t(),
			"!=": (e, t) => e != t(),
			"===": (e, t) => e === t(),
			"!==": (e, t) => e !== t(),
			"<": (e, t) => e < t(),
			">": (e, t) => e > t(),
			"<=": (e, t) => e <= t(),
			">=": (e, t) => e >= t(),
			"<<": (e, t) => e << t(),
			">>": (e, t) => e >> t(),
			">>>": (e, t) => e >>> t(),
			"+": (e, t) => e + t(),
			"-": (e, t) => e - t(),
			"*": (e, t) => e * t(),
			"/": (e, t) => e / t(),
			"%": (e, t) => e % t()
		}[e.operator](m.evalAst(e.left, t), () => m.evalAst(e.right, t));
	},
	evalCompound(e, t) {
		let n;
		for (let r = 0; r < e.body.length; r++) {
			e.body[r].type === "Identifier" && [
				"var",
				"let",
				"const"
			].includes(e.body[r].name) && e.body[r + 1] && e.body[r + 1].type === "AssignmentExpression" && (r += 1);
			let i = e.body[r];
			n = m.evalAst(i, t);
		}
		return n;
	},
	evalConditionalExpression(e, t) {
		return m.evalAst(e.test, t) ? m.evalAst(e.consequent, t) : m.evalAst(e.alternate, t);
	},
	evalIdentifier(e, t) {
		if (Object.hasOwn(t, e.name)) return t[e.name];
		throw ReferenceError(`${e.name} is not defined`);
	},
	evalLiteral(e) {
		return e.value;
	},
	evalMemberExpression(e, t) {
		let n = String(e.computed ? m.evalAst(e.property) : e.property.name), r = m.evalAst(e.object, t);
		if (r == null || !Object.hasOwn(r, n) && p.has(n)) throw TypeError(`Cannot read properties of ${r} (reading '${n}')`);
		let i = r[n];
		return typeof i == "function" ? i.bind(r) : i;
	},
	evalUnaryExpression(e, t) {
		return {
			"-": (e) => -m.evalAst(e, t),
			"!": (e) => !m.evalAst(e, t),
			"~": (e) => ~m.evalAst(e, t),
			"+": (e) => +m.evalAst(e, t),
			typeof: (e) => typeof m.evalAst(e, t),
			void: (e) => void m.evalAst(e, t)
		}[e.operator](e.argument);
	},
	evalArrayExpression(e, t) {
		return e.elements.map((e) => m.evalAst(e, t));
	},
	evalCallExpression(e, t) {
		let n = e.arguments.map((e) => m.evalAst(e, t)), r = m.evalAst(e.callee, t);
		/* c8 ignore start  */
		if (r === Function) throw Error("Function constructor is disabled");
		/* c8 ignore end  */
		return r(...n);
	},
	evalAssignmentExpression(e, t) {
		if (e.left.type !== "Identifier") throw SyntaxError("Invalid left-hand side in assignment");
		let n = e.left.name;
		return t[n] = m.evalAst(e.right, t), t[n];
	}
}, h = class {
	constructor(e) {
		this.code = e, this.ast = a(this.code);
	}
	runInNewContext(e) {
		let t = Object.assign(Object.create(null), e);
		return m.evalAst(this.ast, t);
	}
};
function g(e, t) {
	return e = e.slice(), e.push(t), e;
}
function _(e, t) {
	return t = t.slice(), t.unshift(e), t;
}
var v = class extends Error {
	constructor(e) {
		super("JSONPath should not be called with \"new\" (it prevents return of (unwrapped) scalar values)"), this.avoidNew = !0, this.value = e, this.name = "NewError";
	}
};
function y(e, t, n, r, i) {
	if (!(this instanceof y)) try {
		return new y(e, t, n, r, i);
	} catch (e) {
		if (!e.avoidNew) throw e;
		return e.value;
	}
	typeof e == "string" && (i = r, r = n, n = t, t = e, e = null);
	let a = e && typeof e == "object";
	if (e ||= {}, this.json = e.json || n, this.path = e.path || t, this.resultType = e.resultType || "value", this.flatten = e.flatten || !1, this.wrap = Object.hasOwn(e, "wrap") ? e.wrap : !0, this.sandbox = e.sandbox || {}, this.eval = e.eval === void 0 ? "safe" : e.eval, this.ignoreEvalErrors = e.ignoreEvalErrors === void 0 ? !1 : e.ignoreEvalErrors, this.parent = e.parent || null, this.parentProperty = e.parentProperty || null, this.callback = e.callback || r || null, this.otherTypeCallback = e.otherTypeCallback || i || function() {
		throw TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
	}, e.autostart !== !1) {
		let r = { path: a ? e.path : t };
		a ? "json" in e && (r.json = e.json) : r.json = n;
		let i = this.evaluate(r);
		if (!i || typeof i != "object") throw new v(i);
		return i;
	}
}
y.prototype.evaluate = function(e, t, n, r) {
	let i = this.parent, a = this.parentProperty, { flatten: o, wrap: s } = this;
	if (this.currResultType = this.resultType, this.currEval = this.eval, this.currSandbox = this.sandbox, n ||= this.callback, this.currOtherTypeCallback = r || this.otherTypeCallback, t ||= this.json, e ||= this.path, e && typeof e == "object" && !Array.isArray(e)) {
		if (!e.path && e.path !== "") throw TypeError("You must supply a \"path\" property when providing an object argument to JSONPath.evaluate().");
		if (!Object.hasOwn(e, "json")) throw TypeError("You must supply a \"json\" property when providing an object argument to JSONPath.evaluate().");
		({json: t} = e), o = Object.hasOwn(e, "flatten") ? e.flatten : o, this.currResultType = Object.hasOwn(e, "resultType") ? e.resultType : this.currResultType, this.currSandbox = Object.hasOwn(e, "sandbox") ? e.sandbox : this.currSandbox, s = Object.hasOwn(e, "wrap") ? e.wrap : s, this.currEval = Object.hasOwn(e, "eval") ? e.eval : this.currEval, n = Object.hasOwn(e, "callback") ? e.callback : n, this.currOtherTypeCallback = Object.hasOwn(e, "otherTypeCallback") ? e.otherTypeCallback : this.currOtherTypeCallback, i = Object.hasOwn(e, "parent") ? e.parent : i, a = Object.hasOwn(e, "parentProperty") ? e.parentProperty : a, e = e.path;
	}
	if (i ||= null, a ||= null, Array.isArray(e) && (e = y.toPathString(e)), !e && e !== "" || !t) return;
	let c = y.toPathArray(e);
	c[0] === "$" && c.length > 1 && c.shift(), this._hasParentSelector = null;
	let l = this._trace(c, t, ["$"], i, a, n).filter(function(e) {
		return e && !e.isParentSelector;
	});
	return l.length ? !s && l.length === 1 && !l[0].hasArrExpr ? this._getPreferredOutput(l[0]) : l.reduce((e, t) => {
		let n = this._getPreferredOutput(t);
		return o && Array.isArray(n) ? e = e.concat(n) : e.push(n), e;
	}, []) : s ? [] : void 0;
}, y.prototype._getPreferredOutput = function(e) {
	let t = this.currResultType;
	switch (t) {
		case "all": {
			let t = Array.isArray(e.path) ? e.path : y.toPathArray(e.path);
			return e.pointer = y.toPointer(t), e.path = typeof e.path == "string" ? e.path : y.toPathString(e.path), e;
		}
		case "value":
		case "parent":
		case "parentProperty": return e[t];
		case "path": return y.toPathString(e[t]);
		case "pointer": return y.toPointer(e.path);
		default: throw TypeError("Unknown result type");
	}
}, y.prototype._handleCallback = function(e, t, n) {
	if (t) {
		let r = this._getPreferredOutput(e);
		e.path = typeof e.path == "string" ? e.path : y.toPathString(e.path), t(r, n, e);
	}
}, y.prototype._trace = function(e, t, n, r, i, a, o, s) {
	let c;
	if (!e.length) return c = {
		path: n,
		value: t,
		parent: r,
		parentProperty: i,
		hasArrExpr: o
	}, this._handleCallback(c, a, "value"), c;
	let l = e[0], u = e.slice(1), d = [];
	function f(e) {
		Array.isArray(e) ? e.forEach((e) => {
			d.push(e);
		}) : d.push(e);
	}
	if ((typeof l != "string" || s) && t && Object.hasOwn(t, l)) f(this._trace(u, t[l], g(n, l), t, l, a, o));
	else if (l === "*") this._walk(t, (e) => {
		f(this._trace(u, t[e], g(n, e), t, e, a, !0, !0));
	});
	else if (l === "..") f(this._trace(u, t, n, r, i, a, o)), this._walk(t, (r) => {
		typeof t[r] == "object" && f(this._trace(e.slice(), t[r], g(n, r), t, r, a, !0));
	});
	else if (l === "^") return this._hasParentSelector = !0, {
		path: n.slice(0, -1),
		expr: u,
		isParentSelector: !0
	};
	else if (l === "~") return c = {
		path: g(n, l),
		value: i,
		parent: r,
		parentProperty: null
	}, this._handleCallback(c, a, "property"), c;
	else if (l === "$") f(this._trace(u, t, n, null, null, a, o));
	else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(l)) f(this._slice(l, u, t, n, r, i, a));
	else if (l.indexOf("?(") === 0) {
		if (this.currEval === !1) throw Error("Eval [?(expr)] prevented in JSONPath expression.");
		let e = l.replace(/^\?\((.*?)\)$/u, "$1"), o = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(e);
		o ? this._walk(t, (e) => {
			let s = [o[2]], c = o[1] ? t[e][o[1]] : t[e];
			this._trace(s, c, n, r, i, a, !0).length > 0 && f(this._trace(u, t[e], g(n, e), t, e, a, !0));
		}) : this._walk(t, (o) => {
			this._eval(e, t[o], o, n, r, i) && f(this._trace(u, t[o], g(n, o), t, o, a, !0));
		});
	} else if (l[0] === "(") {
		if (this.currEval === !1) throw Error("Eval [(expr)] prevented in JSONPath expression.");
		f(this._trace(_(this._eval(l, t, n.at(-1), n.slice(0, -1), r, i), u), t, n, r, i, a, o));
	} else if (l[0] === "@") {
		let e = !1, o = l.slice(1, -2);
		switch (o) {
			case "scalar":
				(!t || !["object", "function"].includes(typeof t)) && (e = !0);
				break;
			case "boolean":
			case "string":
			case "undefined":
			case "function":
				typeof t === o && (e = !0);
				break;
			case "integer":
				Number.isFinite(t) && !(t % 1) && (e = !0);
				break;
			case "number":
				Number.isFinite(t) && (e = !0);
				break;
			case "nonFinite":
				typeof t == "number" && !Number.isFinite(t) && (e = !0);
				break;
			case "object":
				t && typeof t === o && (e = !0);
				break;
			case "array":
				Array.isArray(t) && (e = !0);
				break;
			case "other":
				e = this.currOtherTypeCallback(t, n, r, i);
				break;
			case "null":
				t === null && (e = !0);
				break;
			/* c8 ignore next 2 */
			default: throw TypeError("Unknown value type " + o);
		}
		if (e) return c = {
			path: n,
			value: t,
			parent: r,
			parentProperty: i
		}, this._handleCallback(c, a, "value"), c;
	} else if (l[0] === "`" && t && Object.hasOwn(t, l.slice(1))) {
		let e = l.slice(1);
		f(this._trace(u, t[e], g(n, e), t, e, a, o, !0));
	} else if (l.includes(",")) {
		let e = l.split(",");
		for (let o of e) f(this._trace(_(o, u), t, n, r, i, a, !0));
	} else !s && t && Object.hasOwn(t, l) && f(this._trace(u, t[l], g(n, l), t, l, a, o, !0));
	if (this._hasParentSelector) for (let e = 0; e < d.length; e++) {
		let n = d[e];
		if (n && n.isParentSelector) {
			let s = this._trace(n.expr, t, n.path, r, i, a, o);
			if (Array.isArray(s)) {
				d[e] = s[0];
				let t = s.length;
				for (let n = 1; n < t; n++) e++, d.splice(e, 0, s[n]);
			} else d[e] = s;
		}
	}
	return d;
}, y.prototype._walk = function(e, t) {
	if (Array.isArray(e)) {
		let n = e.length;
		for (let e = 0; e < n; e++) t(e);
	} else e && typeof e == "object" && Object.keys(e).forEach((e) => {
		t(e);
	});
}, y.prototype._slice = function(e, t, n, r, i, a, o) {
	if (!Array.isArray(n)) return;
	let s = n.length, c = e.split(":"), l = c[2] && Number.parseInt(c[2]) || 1, u = c[0] && Number.parseInt(c[0]) || 0, d = c[1] && Number.parseInt(c[1]) || s;
	u = u < 0 ? Math.max(0, u + s) : Math.min(s, u), d = d < 0 ? Math.max(0, d + s) : Math.min(s, d);
	let f = [];
	for (let e = u; e < d; e += l) this._trace(_(e, t), n, r, i, a, o, !0).forEach((e) => {
		f.push(e);
	});
	return f;
}, y.prototype._eval = function(e, t, n, r, i, a) {
	this.currSandbox._$_parentProperty = a, this.currSandbox._$_parent = i, this.currSandbox._$_property = n, this.currSandbox._$_root = this.json, this.currSandbox._$_v = t;
	let o = e.includes("@path");
	o && (this.currSandbox._$_path = y.toPathString(r.concat([n])));
	let s = this.currEval + "Script:" + e;
	if (!y.cache[s]) {
		let t = e.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
		if (o && (t = t.replaceAll("@path", "_$_path")), this.currEval === "safe" || this.currEval === !0 || this.currEval === void 0) y.cache[s] = new this.safeVm.Script(t);
		else if (this.currEval === "native") y.cache[s] = new this.vm.Script(t);
		else if (typeof this.currEval == "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
			let e = this.currEval;
			y.cache[s] = new e(t);
		} else if (typeof this.currEval == "function") y.cache[s] = { runInNewContext: (e) => this.currEval(t, e) };
		else throw TypeError(`Unknown "eval" property "${this.currEval}"`);
	}
	try {
		return y.cache[s].runInNewContext(this.currSandbox);
	} catch (t) {
		if (this.ignoreEvalErrors) return !1;
		throw Error("jsonPath: " + t.message + ": " + e);
	}
}, y.cache = {}, y.toPathString = function(e) {
	let t = e, n = t.length, r = "$";
	for (let e = 1; e < n; e++) /^(~|\^|@.*?\(\))$/u.test(t[e]) || (r += /^[0-9*]+$/u.test(t[e]) ? "[" + t[e] + "]" : "['" + t[e] + "']");
	return r;
}, y.toPointer = function(e) {
	let t = e, n = t.length, r = "";
	for (let e = 1; e < n; e++) /^(~|\^|@.*?\(\))$/u.test(t[e]) || (r += "/" + t[e].toString().replaceAll("~", "~0").replaceAll("/", "~1"));
	return r;
}, y.toPathArray = function(e) {
	let { cache: t } = y;
	if (t[e]) return t[e].concat();
	let n = [];
	return t[e] = e.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function(e, t) {
		return "[#" + (n.push(t) - 1) + "]";
	}).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function(e, t) {
		return "['" + t.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
	}).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function(e, t) {
		return ";" + t.split("").join(";") + ";";
	}).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "").split(";").map(function(e) {
		let t = e.match(/#(\d+)/u);
		return !t || !t[1] ? e : n[t[1]];
	}), t[e].concat();
}, y.prototype.safeVm = { Script: h };
var b = function(e, t, n) {
	let r = e.length;
	for (let i = 0; i < r; i++) {
		let r = e[i];
		n(r) && t.push(e.splice(i--, 1)[0]);
	}
}, x = class {
	constructor(e) {
		this.code = e;
	}
	runInNewContext(e) {
		let t = this.code, n = Object.keys(e), r = [];
		b(n, r, (t) => typeof e[t] == "function");
		let i = n.map((t) => e[t]);
		t = r.reduce((t, n) => {
			let r = e[n].toString();
			return /function/u.test(r) || (r = "function " + r), "var " + n + "=" + r + ";" + t;
		}, "") + t, !/(['"])use strict\1/u.test(t) && !n.includes("arguments") && (t = "var arguments = undefined;" + t), t = t.replace(/;\s*$/u, "");
		let a = t.lastIndexOf(";"), o = a === -1 ? " return " + t : t.slice(0, a + 1) + " return " + t.slice(a + 1);
		return Function(...n, o)(...i);
	}
};
y.prototype.vm = { Script: x };
//#endregion
//#region src/resolve.ts
function S(t, n) {
	let r = y({
		path: n,
		json: t,
		wrap: !0
	});
	return !Array.isArray(r) || r.length === 0 ? e : r[0];
}
//#endregion
//#region src/errors.ts
var C = class extends Error {
	path;
	jsonPath;
	constructor(e, t) {
		super(e), this.name = "AjsontError", this.path = t?.path, this.jsonPath = t?.jsonPath;
	}
};
//#endregion
//#region src/operators/path.ts
function w(t, n, r) {
	let i = t.$path, a = S(n, i);
	if (a === e) {
		if ("$default" in t) return t.$default;
		switch (t.$onMissing ?? r.onMissing ?? "omit") {
			case "omit": return e;
			case "null": return null;
			case "error": throw new C(`Missing value at path: ${i}`, { jsonPath: i });
		}
	}
	return a;
}
//#endregion
//#region src/operators/literal.ts
function T(e) {
	return e.$literal;
}
//#endregion
//#region src/operators/concat.ts
function E(t, n, r) {
	let i = t.$concat, a = [];
	for (let o of i) if (typeof o == "string" && o.startsWith("$.")) {
		let i = S(n, o);
		if (i === e) {
			let n = t.$onMissing ?? r.onMissing ?? "omit";
			if (n === "omit") return e;
			n === "null" && a.push("");
		} else a.push(String(i));
	} else a.push(String(o ?? ""));
	return a.join("");
}
//#endregion
//#region src/operators/coalesce.ts
function D(t, n, r) {
	let i = t.$coalesce;
	for (let t of i) {
		let r = S(n, t);
		if (r !== e && r != null) return r;
	}
	if ("$default" in t) return t.$default;
	switch (t.$onMissing ?? r.onMissing ?? "omit") {
		case "omit": return e;
		case "null": return null;
		case "error": throw new C(`All paths in $coalesce resolved to missing: ${i.join(", ")}`);
	}
}
//#endregion
//#region src/operators/string.ts
function O(t, n) {
	let r = t.$lower, i = S(n, r);
	return i === e ? e : String(i).toLowerCase();
}
function k(t, n) {
	let r = t.$upper, i = S(n, r);
	return i === e ? e : String(i).toUpperCase();
}
function A(t, n) {
	let r = t.$trim, i = S(n, r);
	return i === e ? e : String(i).trim();
}
//#endregion
//#region src/operators/conditions.ts
var j = [
	"gt",
	"lt",
	"gte",
	"lte"
];
function M(t, n) {
	if ("exists" in t) return S(n, t.exists) !== e;
	if ("eq" in t) {
		let [r, i] = t.eq, a = S(n, r);
		return a === e ? !1 : a === i;
	}
	if ("ne" in t) {
		let [r, i] = t.ne, a = S(n, r);
		return a === e ? !0 : a !== i;
	}
	for (let r of j) if (r in t) {
		let [i, a] = t[r], o = S(n, i);
		if (o === e) return !1;
		let s = Number(o), c = Number(a);
		return Number.isNaN(s) || Number.isNaN(c) ? !1 : N(r, s, c);
	}
	return !1;
}
function N(e, t, n) {
	switch (e) {
		case "gt": return t > n;
		case "lt": return t < n;
		case "gte": return t >= n;
		case "lte": return t <= n;
	}
}
//#endregion
//#region src/operators/conditional.ts
function P(t, n, r) {
	let i = t.$if, a = M(i, n) ? t.then : t.else;
	return a === void 0 ? e : F(a, n, r);
}
function F(t, n, r) {
	if (typeof t != "object" || !t) {
		if (typeof t == "string" && t.startsWith("$.")) {
			let r = S(n, t);
			return r === e ? null : r;
		}
		return t;
	}
	if (Array.isArray(t)) return t.map((e) => F(e, n, r));
	if (B(t)) return V(t, n, r);
	let i = {};
	for (let [e, a] of Object.entries(t)) i[e] = F(a, n, r);
	return i;
}
//#endregion
//#region src/operators/array.ts
function I(t, n, r) {
	if ("$find" in t && "$filter" in t) throw new C("$find and $filter cannot be used together on the same node");
	let i = L(t, n);
	if (i === e) return R(t, r, `$path resolved to no array: ${t.$path ?? "(scope)"}`);
	if (!Array.isArray(i)) throw new C(`$map/$filter/$find requires an array, got ${typeof i}`, { jsonPath: t.$path });
	if ("$find" in t) {
		let e = t.$find, n = i.find((t) => M(e, t));
		return n === void 0 ? R(t, r, "$find matched no element") : n;
	}
	let a = i;
	if ("$filter" in t) {
		let e = t.$filter;
		a = a.filter((t) => M(e, t));
	}
	if ("$map" in t) {
		let n = t.$map, i = [];
		for (let t of a) {
			let a = U(n, t, r);
			a !== e && i.push(a);
		}
		return i;
	}
	return a;
}
function L(t, n) {
	return "$path" in t ? S(n, t.$path) : Array.isArray(n) ? n : e;
}
function R(t, n, r) {
	if ("$default" in t) return t.$default;
	switch (t.$onMissing ?? n.onMissing ?? "omit") {
		case "null": return null;
		case "error": throw new C(r, { jsonPath: t.$path });
		default: return e;
	}
}
//#endregion
//#region src/operators/index.ts
var z = new Set([
	"$path",
	"$literal",
	"$concat",
	"$coalesce",
	"$lower",
	"$upper",
	"$trim",
	"$if",
	"$map",
	"$filter",
	"$find"
]);
function B(e) {
	return Object.keys(e).some((e) => z.has(e));
}
function V(e, t, n) {
	return "$literal" in e ? T(e) : "$if" in e ? P(e, t, n) : "$map" in e || "$filter" in e || "$find" in e ? I(e, t, n) : "$path" in e ? w(e, t, n) : "$concat" in e ? E(e, t, n) : "$coalesce" in e ? D(e, t, n) : "$lower" in e ? O(e, t) : "$upper" in e ? k(e, t) : "$trim" in e ? A(e, t) : e;
}
//#endregion
//#region src/transform.ts
function H(e, t, n = {}) {
	return U(t, e, {
		onMissing: "omit",
		...n
	});
}
function U(t, n, r) {
	if (typeof t != "object" || !t) return t;
	if (Array.isArray(t)) {
		let i = [];
		for (let a of t) {
			let t = U(a, n, r);
			t !== e && i.push(t);
		}
		return i;
	}
	if (B(t)) return V(t, n, r);
	let i = {};
	for (let [a, o] of Object.entries(t)) {
		let t = U(o, n, r);
		t !== e && (i[a] = t);
	}
	return i;
}
//#endregion
//#region src/validate.ts
var W = new Set([
	"$path",
	"$literal",
	"$concat",
	"$coalesce",
	"$lower",
	"$upper",
	"$trim",
	"$if",
	"$map",
	"$filter",
	"$find",
	"$default",
	"$onMissing"
]), G = new Set([
	"omit",
	"null",
	"error"
]), K = new Set([
	"exists",
	"eq",
	"ne",
	"gt",
	"lt",
	"gte",
	"lte"
]), q = new Set([
	"eq",
	"ne",
	"gt",
	"lt",
	"gte",
	"lte"
]), J = [
	"$map",
	"$filter",
	"$find"
];
function Y(e) {
	let t = [];
	return X(e, "$", t, !1), t;
}
function X(e, t, n, r) {
	if (typeof e != "object" || !e) return;
	if (Array.isArray(e)) {
		e.forEach((e, i) => X(e, `${t}[${i}]`, n, r));
		return;
	}
	let i = Object.keys(e).filter((e) => e.startsWith("$"));
	if (i.length === 0) {
		for (let [i, a] of Object.entries(e)) X(a, `${t}.${i}`, n, r);
		return;
	}
	for (let e of i) W.has(e) || n.push({
		path: t,
		message: `Unknown operator: ${e}`
	});
	let a = e;
	if ("$path" in a && (typeof a.$path == "string" ? a.$path.startsWith("$") || n.push({
		path: t,
		message: "$path must be a valid JSONPath expression (should start with $)"
	}) : n.push({
		path: t,
		message: "$path must be a string"
	})), "$onMissing" in a && (G.has(a.$onMissing) || n.push({
		path: t,
		message: "$onMissing must be one of: omit, null, error"
	})), "$concat" in a && (Array.isArray(a.$concat) || n.push({
		path: t,
		message: "$concat must be an array"
	})), "$coalesce" in a) {
		if (!Array.isArray(a.$coalesce)) n.push({
			path: t,
			message: "$coalesce must be an array"
		});
		else for (let e of a.$coalesce) if (typeof e != "string") {
			n.push({
				path: t,
				message: "$coalesce items must be JSONPath strings"
			});
			break;
		}
	}
	"$if" in a && (Z(a.$if, "$if", t, n), "then" in a || n.push({
		path: t,
		message: "$if requires a \"then\" property"
	})), J.some((e) => e in a) && ("$find" in a && "$filter" in a && n.push({
		path: t,
		message: "$find and $filter cannot be used together on the same node"
	}), !("$path" in a) && !r && n.push({
		path: t,
		message: "$map/$filter/$find requires a $path that resolves to an array (or an enclosing $map scope)"
	}), "$filter" in a && Z(a.$filter, "$filter", t, n), "$find" in a && Z(a.$find, "$find", t, n), "$map" in a && X(a.$map, `${t}.$map`, n, !0));
	for (let e of [
		"$lower",
		"$upper",
		"$trim"
	]) e in a && typeof a[e] != "string" && n.push({
		path: t,
		message: `${e} must be a JSONPath string`
	});
}
function Z(e, t, n, r) {
	if (typeof e != "object" || !e) {
		r.push({
			path: n,
			message: `${t} must be a condition object`
		});
		return;
	}
	let i = e, a = Object.keys(i).filter((e) => K.has(e));
	a.length === 0 && r.push({
		path: n,
		message: `${t} condition must have one of: exists, eq, ne, gt, lt, gte, lte`
	});
	for (let e of Object.keys(i)) K.has(e) || r.push({
		path: n,
		message: `${t} has unknown condition key: ${e}`
	});
	for (let e of a) if (q.has(e)) {
		let a = i[e];
		(!Array.isArray(a) || a.length !== 2) && r.push({
			path: n,
			message: `${t} ${e} must be a [path, value] tuple`
		});
	}
}
//#endregion
export { C as AjsontError, H as transform, Y as validateSpec };
