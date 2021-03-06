/*
  program = block "." .

  block = [ "const" ident "=" number {"," ident "=" number} ";"]
          [ "var" ident {"," ident} ";"]
          { "procedure" ident ";" block ";" } statement .
  statement = [ ident ":=" expression | "call" ident |
              "begin" statement {";" statement } "end" |
              "if" condition "then" statement |
              "while" condition "do" statement ].
  condition = "odd" expression |
              expression ("="|"#"|"<"|"<="|">"|">=") expression .
  expression = [ "+"|"-"] term { ("+"|"-") term}.
  term = factor {("*"|"/") factor}.
  factor = ident | number | "(" expression ")".
*/

function PLZ() {
    function Syntax() {
        var IDENT = 1, NUMBER = 2, KEYWORD = 3;

        function Lexer(source) {
            var tokens = [];
            var unget_token;

            var REGEXP = /\s+|[a-zA-Z][a-zA-Z0-9]*|[0-9]+|:=|<=|>=|[+\-*\/=#<>(),:;!\.]/;
            var KEYWORDS = [
                "begin", "call", "const", "do", "end", "if",
                "odd", "print", "procedure", "then", "var", "while",
                "+", "-", "*", "/", "=", "#", ":=", "(", ")",
                "<", "<=", ">", ">=", ":", ";", ",", ".", "!",
                ];
        
            function Token(type, string) {
                this.type = type;
                this.string = string;
                this.is_keyword = function(keyword) {
                    return (this.type == KEYWORD && this.string == keyword);
                };
            }

            while (source.length > 0) {
                source = source.replace(REGEXP, function (matched) {
                        if (!matched.match(/\s+/))
                            tokens.push(matched);
                        return "";
                    });
            }

            return {
                getnext: function() {
                    var k, t, r;

                    if (unget_token != undefined) {
                        r = unget_token;
                        unget_token = undefined;
                        return r;
                    }

                    t = tokens.shift();
                    if (t == undefined)
                        return null;
                    else if (t.match(/^\d+$/))
                        return new Token(NUMBER, Number(t));
                    else if (KEYWORDS.indexOf(t.toLowerCase()) > -1)
                        return new Token(KEYWORD, t.toLowerCase());
                    else
                        return new Token(IDENT, t);
                },

                unget: function(token) {
                    unget_token = token;
                },

                dump: function() {
                    console.log("XXX dump = ");
                    console.log(tokens);
                }
            };
        }

        function Parser(lexer, debug) {
            function NodeBlock(consts, vars, procs, stmts) {
                return { ntype: "block", consts: consts, vars: vars, procedures: procs, statements: stmts };
            }

            function NodeProcedure(name, block) {
                return { ntype: "procedure", name: name, block: block };
            }

            function NodeIdent(token) {
                return { ntype: "ident", value: token.string };
            }

            function NodeNumber(value) {
                return { ntype: "number", value: Number(token.string) };
            }

            function NodeOperation(op, value1, value2) {
                return { ntype: "operation", opcode: op, value1: value1, value2: value2 };
            }

            function NodeAssign(lvalue, rnode) {
                return { ntype: "assign", lvalue: lvalue, rnode: rnode };
            }

            function NodeIf(cond, stmts) {
                return { ntype: "if", condition: cond, statements: stmts };
            }

            function NodeLoop(cond, stat) {
                return { ntype: "loop", condition: cond, statements: stat };
            }

            function NodeCall(callee) {
                return { ntype: "call", callee: callee };
            }

            function NodePrint(value) {
                return { ntype: "print", value: value };
            }

            function dump_node(indent, ast) {
                function dump_block(indent, block) {
                    var v, i;

                    console.log(indent + "+ [block]");

                    if (block.consts.length > 0) {
                        console.log(indent + "  - consts");
                        for (i = 0; i < block.consts.length; i++) {
                            v = block.consts[i];
                            dump_node(indent + "    ", v);
                        }
                    }

                    if (block.vars.length > 0) {
                        console.log(indent + "  - vars");
                        for (i = 0; i < block.vars.length; i++) {
                            v = block.vars[i];
                            dump_node(indent + "    ", v);
                        }
                    }

                    if (block.procedures.length > 0) {
                        console.log(indent + "  - procedures");
                        for (i = 0; i < block.procedures.length; i++) {
                            v = block.procedures[i];
                            dump_node(indent + "    ", v);
                        }
                    }

                    if (block.statements.length > 0) {
                        console.log(indent + "  - statements");
                        for (i = 0; i < block.statements.length; i++) {
                            v = block.statements[i];
                            dump_node(indent + "    ", v);
                        }
                    }
                }

                function dump_procedure(indent, proc) {
                    console.log(indent + "+ [procedure]");
                    console.log(indent + "  - name: " + proc.name);
                    console.log(indent + "  - block");
                    dump_node(indent + "    ", proc.block);
                }

                function dump_if(indent, ifo) {
                    console.log(indent + "+ [if]");
                    console.log(indent + "  - condition");
                    dump_node(indent + "    ", ifo.condition);

                    if (ifo.statements.length > 0) {
                        console.log(indent + "  - statements");
                        for (i = 0; i < ifo.statements.length; i++)
                            dump_node(indent + "    ", ifo.statements[i]);
                    }
                }

                function dump_loop(ident, loop) {
                    console.log(indent + "+ [loop]");
                    console.log(indent + "  - condition");
                    dump_node(indent + "    ", loop.condition);

                    if (loop.statements.length > 0) {
                        console.log(indent + "  - statements");
                        for (i = 0; i < loop.statements.length; i++)
                            dump_node(indent + "    ", loop.statements[i]);
                    }
                }

                function dump_call(ident, call) {
                    console.log(indent + "+ [call] " + call.callee);
                }

                function dump_print(ident, print) {
                    console.log(indent + "+ [print] " + print.value);
                }

                function dump_assign(indent, stmt) {
                    console.log(indent + "+ [assign]");
                    console.log(indent + "  - lvalue");
                    dump_node(indent + "    ", stmt.lvalue);
                    console.log(indent + "  - rnode");
                    dump_node(indent + "    ", stmt.rnode);
                }

                function dump_operation(indent, stmt) {
                    console.log(indent + "+ [operation]");
                    console.log(indent + "  - opcode: " + stmt.opcode);
                    console.log(indent + "  - value1");
                    dump_node(indent + "    ", stmt.value1);
                    console.log(indent + "  - value2");
                    dump_node(indent + "    ", stmt.value2);
                }

                function dump_ident(indent, value) {
                    console.log(indent + "+ [ident] " + value.value);
                }

                function dump_number(indent, value) {
                    console.log(indent + "+ [number] " + value.value);
                }

                switch (ast.ntype) {
                case "assign":     dump_assign(indent, ast);       break;
                case "block":      dump_block(indent, ast);        break;
                case "call":       dump_call(indent, ast);         break;
                case "ident":      dump_ident(indent, ast);        break;
                case "if":         dump_if(indent, ast);           break;
                case "loop":       dump_loop(indent, ast);         break;
                case "number":     dump_number(indent, ast);       break;
                case "operation":  dump_operation(indent, ast);    break;
                case "print":      dump_print(indent, ast);        break;
                case "procedure":  dump_procedure(indent, ast);    break;
                default:
                    console.log("unknown: " + ast.ntype);
                    console.log(ast);
                    break;
                }
            }

            // program = block "." .
            function program() {
                var r;

                if (debug)
                    console.log("-- parser: program --");

                r = block();
                check_next_keyword(".");

                return r;
            }

            // block = [ "const" ident "=" number {"," ident "=" number} ";"]
            //         [ "var" ident {"," ident} ";"]
            //         { "procedure" ident ";" block ";" } statement .
            function block() {
                var token, c, v, p, s;

                if (debug)
                    console.log("-- parser: block --");

                token = lexer.getnext();
                c = []; v = []; p = [];

                if (token.is_keyword("const")) {
                    c = c.concat(block_const());
                    token = lexer.getnext();
                }

                if (token.is_keyword("var")) {
                    v = v.concat(block_var());
                    token = lexer.getnext();
                }

                while (token.is_keyword("procedure")) {
                    p.push(block_procedure());
                    token = lexer.getnext();
                }

                lexer.unget(token);
                s = statement();

                return NodeBlock(c, v, p, s);
            }

            function block_const() {
                console.log("warning: block_const() has not implemeted yet");
                return [];
            }

            //         [ "var" ident {"," ident} ";"]
            function block_var() {
                var token, vars = [];

                if (debug)
                    console.log("-- parser: block_var --");

                for (;;) {
                    token = lexer.getnext();
                    if (token.type != IDENT)
                        error_unexpected(token);

                    vars.push(NodeIdent(token));
                    token = lexer.getnext();

                    if (token.is_keyword(","))
                        continue;
                    else if (token.is_keyword(";"))
                        return vars;
                    else
                        error_unexpected(token);
                }
            }

            //         { "procedure" ident ";" block ";" }
            function block_procedure() {
                var token, n, b;

                if (debug)
                    console.log("-- parser: block_procedure --");

                token = lexer.getnext();
                if (token.type != IDENT)
                    error_unexpected(token);

                n = token.string;
                check_next_keyword(";");
                b = block();
                check_next_keyword(";");

                return NodeProcedure(n, b);
            }

            // statement = [ ident ":=" expression | "call" ident |
            //             "begin" statement {";" statement } "end" |
            //             "if" condition "then" statement |
            //             "while" condition "do" statement ].
            function statement() {
                var token = lexer.getnext();

                if (debug)
                    console.log("-- parser: statement --");

                if (token.is_keyword("begin"))
                    return statement_begin();
                else if (token.is_keyword("call"))
                    return statement_call();
                else if (token.is_keyword("if"))
                    return statement_if();
                else if (token.is_keyword("!"))
                    return statement_print();
                else if (token.is_keyword("print"))
                    return statement_print();
                else if (token.is_keyword("while"))
                    return statement_while();
                else if (token.type == IDENT)
                    return [ NodeAssign(NodeIdent(token), statement_assign()) ];
                else {
                    lexer.unget(token);
                    return null;
                }
            }

            function statement_assign() {
                check_next_keyword(":=");
                return expression();
            }

            function statement_call() {
                var token;

                token = lexer.getnext();
                if (token.type != IDENT)
                    error_unexpected(token);

                return NodeCall(token.string);
            }

            function statement_begin() {
                var token, r, s = [];

                for (;;) {
                    if ((r = statement()) != null)
                        s = s.concat(r);

                    token = lexer.getnext();
                    if (token.is_keyword(";"))
                        continue;
                    else if (token.is_keyword("end"))
                        return s;
                    else
                        error_unexpected(token);
                }
            }

            //             "if" condition "then" statement |
            function statement_if() {
                var c, s;

                c = condition();
                check_next_keyword("then");
                s = statement();

                return NodeIf(c, s);
            }

            //             "while" condition "do" statement ].
            function statement_while() {
                var c, s;

                c = condition();
                check_next_keyword("do");
                s = statement();

                return NodeLoop(c, s);
            }

            function statement_print() {
                var token;

                token = lexer.getnext();
                if (token.type != IDENT)
                    error_unexpected(token);

                return NodePrint(token.string);
            }

            // condition = "odd" expression |
            //             expression ("="|"#"|"<"|"<="|">"|">=") expression .
            function condition() {
                var v1, v2, token;

                if (debug)
                    console.log("-- parser: condition --");

                token = lexer.getnext();
                if (token.is_keyword("odd")) {
                    v1 = expression();
                    return NodeOperation("odd", v1, nil);
                } else {
                    lexer.unget(token);
                    v1 = expression();

                    token = lexer.getnext();
                    switch (token.string) {
                    case "=": case "<": case "<=": case ">": case ">=":
                        break;
                    default:
                        error_unexpected(token);
                        break;
                    }

                    v2 = expression();
                    return NodeOperation(token.string, v1, v2);
                }
            }

            // expression = ["+"|"-"] term { ("+"|"-") term}.
            function expression() {
                var v1, v2, node, token;

                if (debug)
                    console.log("-- parser: expression --");

                /* XXX */
                token = lexer.getnext();
                switch (token.string) {
                case "+": case "-":
                    break;
                default:
                    lexer.unget(token);
                    break;
                }

                v1 = term();

                for (;;) {
                    token = lexer.getnext();
                    if (!token.is_keyword("+") && !token.is_keyword("-")) {
                        lexer.unget(token);
                        return v1;
                    }

                    v2 = term();
                    v1 = NodeOperation(token.string, v1, v2);
                }
            }

            // term = factor {("*"|"/") factor}.
            function term() {
                var v1, v2, node, token;

                if (debug)
                    console.log("-- parser: term --");

                v1 = factor();

                for (;;) {
                    token = lexer.getnext();
                    if (!token.is_keyword("*") && !token.is_keyword("/")) {
                        lexer.unget(token);
                        return v1;
                    }

                    v2 = factor();
                    v1 = NodeOperation(token.string, v1, v2);
                }
            }

            // factor = ident | number | "(" expression ")".
            function factor() {
                var r;

                if (debug)
                    console.log("-- parser: factor --");

                token = lexer.getnext();
                if (token.type == IDENT)
                    return NodeIdent(token);
                else if (token.type == NUMBER)
                    return NodeNumber(token);
                else if (token.is_keyword("(")) {
                    r = expression();
                    check_next_keyword(")");
                    return r;
                } else {
                    error_unexpected(token);
                    return undefined;
                }
            }

            function check_next_keyword(keyword) {
                t = lexer.getnext();
                if (!t.is_keyword(keyword))
                    error_unexpected(t);
            }

            function error_unexpected(token) {
                console.log("syntax erorr: unexpected token '" + token.string
                            + "' [" + error_unexpected.caller.name
                            + " <- " + error_unexpected.caller.caller.name
                            + " <- " + error_unexpected.caller.caller.caller.name + "]");

                throw "unexpected token";
            }

            return {
                parse: function() {
                    var r;

                    r = program();
                    r.dump = function() { dump_node("", r); };

                    return r;
                }
            };
        }

        return {
            parse: function(source) {
                var lexer = Lexer(source);

                try {
                    return Parser(lexer).parse();
                } catch (e) {
                    console.log(e);
                    lexer.dump();
                }
            }
        };
    }

    function CodeGen(ast) {
        function Environ(name, parent, vars, global) {
            var regs = 0;

            this.name = name;
            this.parent = parent;
            this.tmpregs = 0;
            this.vars = {};
            this.vars_count = vars.length;
            this.global = global;
            this.label_index = 0;

            for (var i = 0; i < vars.length; i++) {
                this.vars[vars[i]] = ((global) ? "gr" : "lr") + regs;
                regs += 1;
            }
        }

        Environ.prototype.getreg = function(value) {
            var reg = this.vars[value];
            if (reg == undefined)
                return this.parent.getreg(value);
            else
                return reg;
        };

        Environ.prototype.gettmpreg = function() {
            return "tr" + this.tmpregs++;
        };

        Environ.prototype.getlocalregs = function() {
            var key, r = [];

            if (!this.global) {
                for (key in this.vars)
                    r.push(this.vars[key]);
            }

            return r;
        };

        Environ.prototype.genlabel = function() {
            var label = "__" + this.name + "_" + this.label_index;
            this.label_index += 1;

            return label;
        };

        function merge_code(basecode, newcode) {
            if (newcode == undefined)
                return basecode;
            if (typeof newcode[0] == "object")
                return basecode.concat(newcode);
            else {
                basecode.push(newcode);
                return basecode;
            }
        }

        function codegen_block(env, block) {
            var i, s, rcode = [];

            if (debug) {
                console.log("---- environ ----");
                console.log(env);
            }

            rcode = merge_code(rcode, codegen_statements(env, block.statements));
            rcode.push([ "ret" ]);

            return rcode;
        }

        function codegen_statements(env, statements) {
            var i, r, rcode = [];

            for (i = 0; i < statements.length; i++) {
                r = codegen_stmt(env, statements[i]);

                if (debug) {
                    console.log("==== code ====");
                    console.log(r);
                }

                if (typeof r[0] == "object")
                    rcode = merge_code(rcode, r);
                else
                    rcode.push(r);
            }

            return rcode;
        }

        function codegen_stmt(env, stmt, dst) {
            var reg;

            if (debug) {
                console.log("---- statement ----");
                console.log(stmt);
            }

            switch (stmt.ntype) {
            case "assign":
                return codegen_stmt_assign(env, stmt, dst);
            case "operation":
                return codegen_stmt_op(env, stmt, dst);
            case "if":
                return codegen_stmt_if(env, stmt, dst);
            case "loop":
                return codegen_stmt_loop(env, stmt, dst);
            case "call":
                return codegen_stmt_call(env, stmt, dst);
            case "print":
                return codegen_stmt_print(env, stmt, dst);
            default:
                throw "unknown statement type";
            }
        }

        function codegen_stmt_assign(env, stmt) {
            reg = env.getreg(stmt.lvalue.value);
            switch (stmt.rnode.ntype) {
            case "number":
                return [ "add", reg, stmt.rnode.value, 0 ];
            case "ident":
                return [ "add", reg, env.getreg(stmt.rnode.value), 0 ];
            case "operation":
                return codegen_stmt_op(env, stmt.rnode, reg);

            default:
                return undefined;
            }
        }

        function codegen_stmt_op(env, stmt, dst) {
            var v1, v2, vdst, rcode = [];
            var tmpreg;

            if (debug) {
                console.log("---- statement: operation ----");
                console.log(stmt);
            }

            function stmt_value(value) {
                var rtmp;

                switch (value.ntype) {
                case "number":
                    return value.value;
                case "ident":
                    return env.getreg(value.value);
                case "operation":
                    rtmp = env.gettmpreg();
                    rcode = merge_code(rcode, codegen_stmt_op(env, value, rtmp));
                    tmpreg = rtmp;
                    return rtmp;

                default:
                    throw "unknown value type";
                }
            }

            v1 = stmt_value(stmt.value1, rcode);
            v2 = stmt_value(stmt.value2, rcode);
            vdst = (dst == undefined) ? v1 : dst;

            switch (stmt.opcode) {
            case "+":
                rcode.push([ "add", vdst, v1, v2 ]);
                break;
            case "-":
                rcode.push([ "sub", vdst, v1, v2 ]);
                break;
            case "*":
                rcode.push([ "mul", vdst, v1, v2 ]);
                break;
            case "/":
                rcode.push([ "div", vdst, v1, v2 ]);
                break;

            case "=":
                rcode.push([ "bne", vdst, v1, v2 ]);
                break;
            case "<":
                rcode.push([ "bge", vdst, v1, v2 ]);
                break;
            case "<=":
                rcode.push([ "bgt", vdst, v1, v2 ]);
                break;
            case ">":
                rcode.push([ "ble", vdst, v1, v2 ]);
                break;
            case ">=":
                rcode.push([ "blt", vdst, v1, v2 ]);
                break;

            default:
                throw "unknown opcode";
            }

            return rcode;
        }

        function codegen_stmt_if(env, stmt) {
            var rcode = [], else_label;

            if (debug) {
                console.log("------ if ------");
                console.log(stmt);
            }

            else_label = env.genlabel();
            rcode = merge_code(rcode, codegen_stmt(env, stmt.condition, else_label ));
            rcode = merge_code(rcode, codegen_statements(env, stmt.statements));
            rcode.push([ "_label", else_label ]);

            return rcode;
        }

        function codegen_stmt_loop(env, stmt) {
            var r, rcode = [], start_label, end_label;

            if (debug)
                console.log("------ loop ------");

            start_label = env.genlabel();
            end_label = env.genlabel();

            rcode.push([ "_label", start_label ]);
            rcode = merge_code(rcode, codegen_stmt(env, stmt.condition, end_label ));

            if (debug)
                console.log("-------- loop: statements --------");

            rcode = merge_code(rcode, codegen_statements(env, stmt.statements));
            rcode.push([ "jmp", start_label ]);
            rcode.push([ "_label", end_label ]);

            return rcode;
        }

        function codegen_stmt_call(env, stmt) {
            var i, localregs, label, rcode = [];

            if (debug)
                console.log("------ call ------");

            localregs = env.getlocalregs();
            label = "_" + stmt.callee;
            rcode.push([ "call", label ]);

            return rcode;
        }

        function codegen_stmt_print(env, stmt) {
            return [ "_print", 0, env.getreg(stmt.value), 0 ];
        }

        function print_code(code) {
            var i, c, operands;

            function strl(str, len) {
                var i, l, s;

                str = String(str);
                l = len - str.length;
                for (i = 0, s = ""; i < l; i++)
                    s += " ";

                return str + s;
            }

            for (i = 0; i < code.length; i++) {
                c = code[i];

                if (c[3] != undefined)
                    operands = 3;
                else if (c[2] != undefined)
                    operands = 2;
                else if (c[1] != undefined)
                    operands = 1;
                else
                    operands = 0;

                if (c[0] == "_label")
                    console.log("| " + c[1] + ":");
                else {
                    switch (operands) {
                    case 0:
                        console.log("| \t" + c[0]);
                        break;
                    case 1:
                        console.log("| \t" + c[0] + "\t\t"
                                    + strl(c[1] + ",", 12));
                        break;
                    case 2:
                        console.log("| \t" + c[0] + "\t\t"
                                    + strl(c[1] + ",", 12) + "\t"
                                    + c[2]);
                        break;
                    case 3:
                        console.log("| \t" + c[0] + "\t\t"
                                    + strl(c[1] + ",", 12) + "\t"
                                    + strl(c[2] + ",", 12) + "\t"
                                    + c[3]);
                        break;
                    }
                }
            }
        }

        return {
            codegen: function(ast) {
                var i, r, len, code = [], root_env, proc_name, proc_block, proc_env;

                for (i = 0, r = []; i < ast.vars.length; i++)
                    r.push(ast.vars[i].value);

                root_env = new Environ("main", null, r, true);
                code.push([ "_label", "_main" ]);
                code.push([ "_frame", root_env.vars_count ]);
                code = code.concat(codegen_block(root_env, ast));

                for (i = 0; i < ast.procedures.length; i++) {
                    proc_name = ast.procedures[i].name;
                    proc_block = ast.procedures[i].block;

                    for (i = 0, r = []; i < proc_block.vars.length; i++)
                        r.push(proc_block.vars[i].value);

                    proc_env = new Environ(proc_name, root_env, r, false);
                    len = 0; for (var x in proc_env.vars) { len++; }

                    code.push([ "_label", "_" + proc_name ]);
                    code.push([ "_frame", proc_env.vars_count ]);
                    code = code.concat(codegen_block(proc_env, proc_block));
                }

                code.dump = function() { print_code(code); };

                return code;
            }
        };
    }

    this.parse = function(source) {
        return Syntax().parse(source);
    }

    this.generate_il = function(ast) {
        return CodeGen().codegen(ast);
    }
}

function PLZ_ILVM(code, ilvm_debug) {
    var regs = [], stack = [];

    function make_labelmap(code) {
        var i, lmap = {};

        for (i = 0; i < code.length; i++) {
            if (code[i][0] == "_label")
                lmap[code[i][1]] = i;
        }

        return lmap
    }

    function loadopr(operand) {
        var r;

        if (typeof operand == "string" && operand[0] == "r") {
            if ((r = regs[Number(operand.slice(1))]) == undefined)
                r = 0;
        } else {
            r = operand;  // Number(operand);
        }

        return r;
    }

    function writeback(dst, value) {
        if (dst[0] != "r")
            throw "dst is not a register";

        regs[Number(dst.slice(1))] = value;

        if (ilvm_debug) {
            console.log("\nregs =");
            console.log(regs);
            console.log("");
        }
    }

    this.run = function() {
        var pc, clock, opcode, dst, opr1, opr2;
        var labelmap = make_labelmap(code);

        for (pc = 0, clock = 1; pc < code.length; pc++, clock++) {
            if (ilvm_debug)
                console.log(clock + ": pc[" + pc + "] " + code[pc]);

            opcode = code[pc][0];
            dst = code[pc][1];
            opr1 = loadopr(code[pc][2]);
            opr2 = loadopr(code[pc][3]);

            switch (opcode) {
            case "_label":
                break;  // nop

            case "add":
                writeback(dst, opr1 + opr2);
                break;
            case "sub":
                writeback(dst, opr1 - opr2);
                break;
            case "mul":
                writeback(dst, opr1 * opr2);
                break;
            case "div":
                writeback(dst, parseInt(opr1 / opr2));
                break;

            case "bne":
                if (opr1 != opr2)
                    pc = labelmap[dst];
                break;
            case "bge":
                if (opr1 >= opr2)
                    pc = labelmap[dst];
                break;
            case "bgt":
                if (opr1 > opr2)
                    pc = labelmap[dst];
                break;
            case "ble":
                if (opr1 <= opr2)
                    pc = labelmap[dst];
                break;
            case "blt":
                if (opr1 < opr2)
                    pc = labelmap[dst];
                break;
            case "jmp":
                pc = labelmap[dst];
                break;

            case "call":
                stack.push(pc);
                pc = labelmap[dst];
                break;
            case "ret":
                pc = stack.pop();
                if (pc == undefined)
                    return;
                break;

            case "push":
                stack.push(loadopr(dst));
                break;
            case "pop":
                writeback(dst, stack.pop());
                break;
            case "_print":
                console.log(loadopr(dst));
                break;

            default:
                throw "unknown opcode";
            }
        }
    }
}

function CodeGenX86(ilcode) {
    var Regs = function() {
        var iareg_status = {};

        function iareg_init() {
            iareg_status = {
                "eax": { used: false }, "ebx": { used: false },
                "ecx": { used: false }, "edx": { used: false },
                "esi": { used: false }, "edi": { used: false },
            };
        }

        function iareg_reserve(iareg) {
            if (iareg_status[iareg].used)
                return false;
            else {
                iareg_status[iareg].used = true;
                return true;
            }
        }

        function iareg_any() {
            for (var key in iareg_status) {
                if (iareg_status[key].used == false)
                    return key;
            }

            throw "XXX noregs";
        }

        function iareg_use(iareg) {
            var nreg;

            if (iareg == undefined)
                throw "reg is undefined";

            if (iareg_reserve(iareg) == false) {
                if ((nreg = iareg_any()) != undefined) {
                    // move reg to other reg is available
                    iareg_reserve(nreg);
                    iareg_rename(nreg, iareg);
                    iareg_reserve(iareg);
                    return [ "mov", nreg, iareg ];
                } else {
                    // all registers are used. push to swap...
                    throw "XXX no register";
                }
            }
        }

        function iareg_rename(new_iareg, old_iareg) {
            iareg_status[new_iareg].vreg = iareg_status[old_iareg].vreg;
            iareg_status[new_iareg].value = iareg_status[old_iareg].value;
            iareg_destroy(old_iareg);
        }

        function iareg_release(iareg) {
            if (iareg_status[iareg] != undefined)
                iareg_status[iareg].used = false;
        }

        function iareg_destroy(iareg) {
            if (iareg_status[iareg] != undefined) {
                iareg_status[iareg].used = false;
                delete iareg_status[iareg].vreg;
                delete iareg_status[iareg].value;
            }
        }

        function iareg_assoc_vreg(iareg, vreg) {
            iareg_status[iareg].vreg = vreg;
        }

        function iareg_assoc_const(iareg, value) {
            iareg_status[iareg].value = value;
        }

        function vreg_resolv_iareg(vreg) {
            for (var key in iareg_status) {
                if (iareg_status[key].vreg == vreg)
                    return key;
            }
        }

        // XXX multi assoc
        function vreg_resolv_number(vreg) {
            for (var key in iareg_status) {
                if (iareg_status[key].vreg == vreg)
                    return iareg_status[key].value;
            }
        }

        function vreg_assoc_const(vreg, value) {
            for (var key in iareg_status) {
                if (iareg_status[key].vreg == vreg) {
                    if (value == null)
                        delete iareg_status[key].value;
                    else
                        iareg_status[key].value = value;
                }
            }
        }

        iareg_init();

        return {
        iareg_init: iareg_init,
        iareg_any: iareg_any,
        iareg_use: iareg_use,
        iareg_release: iareg_release,
        iareg_destroy: iareg_destroy,
        iareg_assoc_vreg: iareg_assoc_vreg,
        iareg_assoc_const: iareg_assoc_const,

        vreg_resolv_number: vreg_resolv_number,
        vreg_resolv_iareg: vreg_resolv_iareg,
        vreg_assoc_const: vreg_assoc_const,

        showtable: function() {
                console.log(iareg_status);
            }
        };
    }();

    function Operands(dst, opr1, opr2, opspec) {
        var opcost = {
            "gr": {
                "eax": { cost: 12 },
                "reg": { cost: 11,     gencode: generate_opr_gr_reg },
                "mem": { cost: 10,     gencode: generate_opr_gr_mem },
                "imm": { cost: undefined },
            },

            "lr": {
                "eax": { cost: 12 },
                "reg": { cost: 11,     gencode: generate_opr_lr_reg },
                "mem": { cost: 10,     gencode: generate_opr_lr_mem },
                "imm": { cost: undefined },
            },

            "tr": {
                "eax": { cost: 1,      gencode: generate_opr_tr_eax },
                "reg": { cost: 0,      gencode: generate_opr_tr_reg },
                "mem": { cost: undefined },
                "imm": { cost: undefined },
            },

            "eax": {
                "eax": { cost: 0,      gencode: generate_opr_tr_reg },
                "reg": { cost: 1,      gencode: generate_opr_tr_reg },
                "mem": { cost: undefined },
                "imm": { cost: undefined },
            },

            "number": {
                "eax": { cost: 2,      gencode: generate_opr_num_eax },
                "reg": { cost: 1,      gencode: generate_opr_num_reg },
                "mem": { cost: undefined },
                "imm": { cost: 0,      gencode: generate_opr_num_imm },
            },
        };

        var epitab = {
            "eax": {
                "gr": generate_epi_eax_gr,
                "lr": generate_epi_eax_lr,
                "tr": generate_epi_eax_tr,
            },

            "reg": {
                "gr": generate_epi_reg_gr,
                "lr": generate_epi_reg_lr,
                "tr": generate_epi_reg_tr,
            },

            "imm": {
                "gr": generate_epi_imm_gr,
                "lr": generate_epi_imm_lr,
                "tr": generate_epi_imm_tr,
            },
        };

        function lraddr(lreg) {
            var n = parseInt(lreg.substr(2));
            return "[ebp-" + (n + 1) * 4 + "]";
        }

        function generate_opr_gr_reg(opr) {
            var reg, rcode = [];

            if ((reg = Regs.vreg_resolv_iareg(opr)) == undefined) {
                reg = Regs.iareg_any();
                rcode = merge_code(rcode, Regs.iareg_use(reg));
                rcode.push([ "mov", reg, "[" + opr + "]" ]);
                Regs.iareg_assoc_vreg(reg, opr);
                Regs.iareg_assoc_const(reg, null);
            }

            return [ rcode, reg ];
        }

        function generate_opr_gr_mem(opr) {
            return [ undefined, "dword ptr [" + opr + "]" ];
        }

        function generate_opr_lr_reg(opr) {
            var reg, rcode = [];

            if ((reg = Regs.vreg_resolv_iareg(opr)) == undefined) {
                reg = Regs.iareg_any();
                rcode = merge_code(rcode, Regs.iareg_use(reg));
                rcode.push([ "mov", reg, lraddr(opr) ]);
                Regs.iareg_assoc_vreg(reg, opr);
                Regs.iareg_assoc_const(reg, null);
            }

            return [ rcode, reg ];
        }

        function generate_opr_lr_mem(opr) {
            return [ undefined, "dword ptr " + lraddr(opr) ];
        }

        function generate_opr_tr_eax(opr) {
            var rcode = [];

            if ((reg = Regs.vreg_resolv_iareg(opr)) != "eax") {
                rcode = merge_code(rcode, Regs.iareg_use("eax"));
                rcode.push([ "mov", "eax", reg ]);
                Regs.iareg_assoc_vreg("eax", opr);
                Regs.iareg_assoc_const("eax", null);
            }

            return [ rcode, reg ];
        }

        function generate_opr_tr_reg(opr) {
            var reg, rcode = [];

            if ((reg = Regs.vreg_resolv_iareg(opr)) == undefined) {
                reg = Regs.iareg_any();
                rcode = merge_code(rcode, Regs.iareg_use(reg));
                Regs.iareg_assoc_vreg(reg, opr);
                Regs.iareg_assoc_const(reg, null);
            }

            return [ rcode, reg ];
        }

        function generate_opr_num_eax(opr) {
            var rcode = [];

            rcode = merge_code(rcode, Regs.iareg_use("eax"));
            rcode.push([ "mov", "eax", opr ]);
            Regs.iareg_assoc_const("eax", opr);

            return [ rcode, "eax" ];
        }

        function generate_opr_num_reg(opr) {
            var rcode = [];
            var reg = Regs.iareg_any();

            rcode = merge_code(rcode, Regs.iareg_use(reg));
            rcode.push([ "mov", reg, opr ]);
            Regs.iareg_assoc_const(reg, opr);

            return [ rcode, reg ];
        }

        function generate_opr_num_imm(opr) {
            return [ undefined, opr ];
        }

        ///////
        function generate_epi_eax_gr(dst, opr1) {
            var rcode = [];

            rcode.push([ "mov", "[" + dst + "]", "eax" ]);
            Regs.iareg_assoc_vreg("eax", dst);
            Regs.vreg_assoc_const(dst, null);

            return rcode;
        }

        function generate_epi_eax_lr(dst, opr1) {
            var rcode = [];

            rcode.push([ "mov", lraddr(dst), "eax" ]);
            Regs.iareg_assoc_vreg("eax", dst);
            Regs.vreg_assoc_const(dst, null);

            return rcode;
        }

        function generate_epi_eax_tr(dst, opr1) {
            Regs.iareg_assoc_vreg("eax", dst);
            Regs.vreg_assoc_const(dst, null);
            return [];
        }

        function generate_epi_reg_gr(dst, opr1) {
            var rcode = [];

            rcode.push([ "mov", "[" + dst + "]", opr1 ]);
            Regs.iareg_assoc_vreg(opr1, dst);
            Regs.iareg_release(opr1);
            Regs.vreg_assoc_const(dst, null);

            return rcode;
        }

        function generate_epi_reg_lr(dst, opr1) {
            var rcode = [];

            rcode.push([ "mov", lraddr(dst), opr1 ]);
            Regs.iareg_assoc_vreg(opr1, dst);
            Regs.iareg_release(opr1);
            Regs.vreg_assoc_const(dst, null);

            return rcode;
        }

        function generate_epi_reg_tr(dst, opr1) {
            Regs.iareg_assoc_vreg(opr1, dst);
            Regs.vreg_assoc_const(dst, null);
            return [];
        }

        function generate_epi_imm_gr(dst, opr1) {
            Regs.vreg_assoc_const(dst, opr1);
            return [ "mov", "dword ptr [" + dst + "]", opr1 ];
        }

        function generate_epi_imm_lr(dst, opr1) {
            Regs.vreg_assoc_const(dst, opr1);
            return [ "mov", lraddr(dst), opr1 ];
        }

        function generate_epi_imm_tr(dst, opr1) {
            var rcode = [];
            var reg = Regs.iareg_any();

            rcode = merge_code(rcode, Regs.iareg_use(reg));
            rcode.push([ "mov", reg, opr1 ]);

            // opr1 -> imm
            // reg  -> iareg (tmp)
            // dst  -> treg

            Regs.iareg_assoc_vreg(reg, dst);
            Regs.vreg_assoc_const(dst, opr1);

            return rcode;
        }

        function generate_opr(opr, target) {
            // XXX 2 type case? e.g. register and const (cached)
            var t = oprtype(opr);

            if (debug)
                console.log("generate_opr: " + t + " -> " + target);
            if (opcost[t][target].gencode == undefined)
                throw "unsuppotyed operand";

            return opcost[t][target].gencode(opr);
        }

        function oprtype(opr) {
            if (opr == undefined)
                return "none";
            if (typeof opr == "number")
                return "number";
            if (opr.match(/^gr/))
                return "gr";
            if (opr.match(/^lr/))
                return "lr";
            if (opr.match(/^tr/))
                return (Regs.vreg_resolv_iareg(opr) == "eax") ? "eax" : "tr";

            throw "unknown operand type: " + opr;
        }

        function oprcost(opr1, opr2, opspec) {
            if (opspec.srcspec == undefined)
                return {};

            var t1 = oprtype(opr1);
            var t2 = oprtype(opr2);
            var cost1 = opcost[t1][opspec.srcspec[0]].cost + opcost[t2][opspec.srcspec[1]].cost;
            var cost2 = opcost[t1][opspec.srcspec[1]].cost + opcost[t2][opspec.srcspec[0]].cost;

            if (isNaN(cost1) && isNaN(cost2))
                return {};
            else if (isNaN(cost2) || !opspec.srcswap || cost1 <= cost2 )
                return { cost: cost1, opr1: opr1, opr2: opr2 };
            else
                return { cost: cost2, opr1: opr2, opr2: opr1 };
        }

        // { srcspec: [ "reg", "reg" ], dstspec: "reg", srcswap: true, codegen: f },

        var r = oprcost(opr1, opr2, opspec);
        this.opspec = opspec;
        this.cost = r.cost;
        this.opr1 = r.opr1;
        this.opr2 = r.opr2;

        this.generate_prologue = function() {
            if (this.opspec.srcspec == undefined)
                return [];

            var rcode = [];
            var g1 = generate_opr(this.opr1, this.opspec.srcspec[0]);
            var g2 = generate_opr(this.opr2, this.opspec.srcspec[1]);

            this.opr1_iaop = g1[1];
            this.opr2_iaop = g2[1];

            rcode = merge_code(rcode, g1[0]);
            rcode = merge_code(rcode, g2[0]);
            return rcode;
        }

        this.generate_epilogue = function(dst, rvalue) {
            if (this.opspec.dstspec == undefined)
                return [];

            var t = oprtype(dst);
            var f = epitab[this.opspec.dstspec][t];
            var epispec = this.opspec.dstspec + " -> " + t;

            if (f == undefined)
                throw "epilogue not implemented: " + epispec;
            if (debug)
                console.log("epilogue: " + epispec);

            if (rvalue == undefined)
                rvalue = this.opr1_iaop;

            return f(dst, rvalue);
        }
    };

    function generate_code(dst, opr1, opr2, opspec) {
        var i, opr, bopr, r, gcode, rcode, epicode;

        for (i = 0; i < opspec.length; i++) {
            opr = new Operands(dst, opr1, opr2, opspec[i]);
            if (bopr == undefined || opr.cost < bopr.cost)
                bopr = opr;
        }

        rcode = bopr.generate_prologue();

        if (debug) {
            console.log('>>> prologue');
            console.log(rcode);
            console.log('<<<');
        }

        r = bopr.opspec.codegen(bopr.opr1_iaop, bopr.opr2_iaop);
        gcode = r[0];
        rcode = merge_code(rcode, gcode);

        if (debug) {
            console.log('>>> code');
            console.log(gcode);
            console.log('<<<');
        }

        epicode = bopr.generate_epilogue(dst, r[1]);
        rcode = merge_code(rcode, epicode);

        if (debug) {
            console.log('>>> epilogue');
            console.log(epicode);
            console.log('<<<');
        }

        if (typeof bopr.opr2_iaop == "string")
            Regs.iareg_release(bopr.opr2_iaop);

        if (debug)
            Regs.showtable();

        return rcode;
    }

    function generate_code_label(dst, opcode, opr1, opr2) {
        Regs.iareg_init();
        return [ [ "_label", dst ] ];
    }

    function generate_code_frame(dst, opcode, opr1, opr2) {
        var rcode = [];

        rcode.push([ 'push', 'ebp' ]);
        rcode.push([ 'mov', 'ebp', 'esp' ]);
        rcode.push([ 'sub', 'esp', dst * 4 ]);
        return rcode;
    }

    function generate_code_print(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            var rcode = [];

            rcode.push([ "push", opr1 ]);
            rcode.push([ "call", "_print" ]);
            rcode.push([ "add", "esp", 4 ]);

            Regs.iareg_init();
            return [ rcode ];
        };

        var t = [
            { srcspec: [ "mem", "imm" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "imm" ], srcswap: false, codegen: f },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_add(dst, opcode, opr1, opr2) {
        function add_reg(opr1, opr2) {
            if (opr2 == 0)
                return [ [] ];
            else
                return [ [ "add", opr1, opr2 ] ];
        };

        function add_imm(opr1, opr2) {
            return [ undefined, opr1 + opr2 ];
        };

        var t = [
            { srcspec: [ "reg", "reg" ], dstspec: "reg", srcswap: true, codegen: add_reg },
            { srcspec: [ "reg", "imm" ], dstspec: "reg", srcswap: true, codegen: add_reg },
            { srcspec: [ "reg", "mem" ], dstspec: "reg", srcswap: true, codegen: add_reg },
            { srcspec: [ "imm", "imm" ], dstspec: "imm", srcswap: true, codegen: add_imm },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_sub(dst, opcode, opr1, opr2) {
	function sub_reg(opr1, opr2) {
            if (opr2 == 0)
                return [ [] ];
            else
               return [ [ "sub", opr1, opr2 ] ];
        };

        function sub_imm(opr1, opr2) {
            return [ undefined, opr1 - opr2 ];
        };

        var t = [
            { srcspec: [ "reg", "reg" ], dstspec: "reg", srcswap: false, codegen: sub_reg },
            { srcspec: [ "reg", "imm" ], dstspec: "reg", srcswap: false, codegen: sub_reg },
            { srcspec: [ "reg", "mem" ], dstspec: "reg", srcswap: false, codegen: sub_reg },
            { srcspec: [ "imm", "imm" ], dstspec: "imm", srcswap: false, codegen: sub_imm },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_mul(dst, opcode, opr1, opr2) {
        // mul reg/mem -> edx:eax = eax * r/m
        function mul_reg1(opr1, opr2) {
            Regs.iareg_destroy("edx");
            return [ [ "imul", opr2 ] ];
        };

        function mul_reg2(opr1, opr2) {
            return [ [ "imul", opr1, opr2 ] ];
        };


        function mul_imm(opr1, opr2) {
            return [ undefined, opr1 * opr2 ];
        };

        var t = [
            { srcspec: [ "eax", "reg" ], dstspec: "eax", srcswap: true, codegen: mul_reg1 },
            { srcspec: [ "eax", "mem" ], dstspec: "eax", srcswap: true, codegen: mul_reg1 },

            { srcspec: [ "reg", "reg" ], dstspec: "reg", srcswap: true, codegen: mul_reg2 },
            { srcspec: [ "reg", "mem" ], dstspec: "reg", srcswap: true, codegen: mul_reg2 },
            { srcspec: [ "reg", "imm" ], dstspec: "reg", srcswap: true, codegen: mul_reg2 },

            { srcspec: [ "imm", "imm" ], dstspec: "imm", srcswap: true, codegen: mul_imm },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_div(dst, opcode, opr1, opr2) {
        // div reg/mem -> edx, eax = edx:eax / r/m
        function div_reg(opr1, opr2) {
            var rcode = [];
            Regs.iareg_destroy("edx");
            rcode.push([ "xor", "edx", "edx" ]);
            rcode.push([ "idiv", opr2 ]);
            return [ rcode ];
        };

        function div_imm(opr1, opr2) {
            return [ undefined, parseInt(opr1 / opr2) ];
        };

        var t = [
            { srcspec: [ "eax", "reg" ], dstspec: "eax", srcswap: false, codegen: div_reg },
            { srcspec: [ "eax", "mem" ], dstspec: "eax", srcswap: false, codegen: div_reg },
            { srcspec: [ "imm", "imm" ], dstspec: "imm", srcswap: false, codegen: div_imm },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_bne(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            var rcode = [];
            rcode.push([ "cmp", opr1, opr2 ]);
            rcode.push([ "jne", dst ]);
            return [ rcode ];
        };

        var t = [
            { srcspec: [ "reg", "reg" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "imm" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "mem" ], srcswap: false, codegen: f },
            { srcspec: [ "mem", "imm" ], srcswap: false, codegen: f },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_bge(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            var rcode = [];
            rcode.push([ "cmp", opr1, opr2 ]);
            rcode.push([ "jae", dst ]);
            return [ rcode ];
        };

        var t = [
            { srcspec: [ "reg", "reg" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "imm" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "mem" ], srcswap: false, codegen: f },
            { srcspec: [ "mem", "imm" ], srcswap: false, codegen: f },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_bgt(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            var rcode = [];
            rcode.push([ "cmp", opr1, opr2 ]);
            rcode.push([ "ja", dst ]);
            return [ rcode ];
        };

        var t = [
            { srcspec: [ "reg", "reg" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "imm" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "mem" ], srcswap: false, codegen: f },
            { srcspec: [ "mem", "imm" ], srcswap: false, codegen: f },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_ble(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            var rcode = [];
            rcode.push([ "cmp", opr1, opr2 ]);
            rcode.push([ "jbe", dst ]);
            return [ rcode ];
        };

        var t = [
            { srcspec: [ "reg", "reg" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "imm" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "mem" ], srcswap: false, codegen: f },
            { srcspec: [ "mem", "imm" ], srcswap: false, codegen: f },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_blt(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            var rcode = [];
            rcode.push([ "cmp", opr1, opr2 ]);
            rcode.push([ "jb", dst ]);
            return [ rcode ];
        };

        var t = [
            { srcspec: [ "reg", "reg" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "imm" ], srcswap: false, codegen: f },
            { srcspec: [ "reg", "mem" ], srcswap: false, codegen: f },
            { srcspec: [ "mem", "imm" ], srcswap: false, codegen: f },
            ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_jmp(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            return [ [ "jmp", dst ] ];
        };

        var t = [ { codegen: f } ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_call(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            Regs.iareg_init();
            return [ [ "call", dst ] ];
        };

        var t = [ { codegen: f } ];

        return generate_code(dst, opr1, opr2, t);
    }

    function generate_code_ret(dst, opcode, opr1, opr2) {
        var f = function(opr1, opr2) {
            var rcode = [];
            rcode.push([ "mov", "esp", "ebp" ]);
            rcode.push([ "pop", "ebp" ]);
            rcode.push([ "ret" ]);
            return [ rcode ];
        };

        var t = [ { codegen: f } ];

        return generate_code(dst, opr1, opr2, t);
    }

    function merge_code(basecode, newcode) {
        if (newcode == undefined)
            return basecode;
        if (typeof newcode[0] == "object")
            return basecode.concat(newcode);
        else {
            if (newcode.length > 0)
                basecode.push(newcode);
            return basecode;
        }
    }

    var gencode_table = {
        "_label": generate_code_label,
        "_frame": generate_code_frame,
        "_print": generate_code_print,

        "add": generate_code_add,
        "sub": generate_code_sub,
        "mul": generate_code_mul,
        "div": generate_code_div,

        "bne": generate_code_bne,
        "bge": generate_code_bge,
        "bgt": generate_code_bgt,
        "ble": generate_code_ble,
        "blt": generate_code_blt,

        "jmp": generate_code_jmp,
        "call": generate_code_call,
        "ret": generate_code_ret
    };

    this.generate_code = function() {
        var i, f, opcode, dst, opr1, opr2, rcode = [];

        for (i = 0; i < ilcode.length; i++) {
            if (debug) {
                console.log("----");
                console.log("IL = " + ilcode[i]);
            }

            opcode = ilcode[i][0];
            dst = ilcode[i][1];
            opr1 = ilcode[i][2];
            opr2 = ilcode[i][3];

            if ((f = gencode_table[opcode]) == undefined)
                throw "unknown opcode: " + opcode;

            rcode = merge_code(rcode, f(dst, opcode, opr1, opr2));
        }

	return rcode;
    }
}

var debug = process.argv[3];
var fs = require("fs");
var src = "" + fs.readFileSync(process.argv[2]);
var plz = new PLZ();

var ast = plz.parse(src);
if (debug)
    ast.dump();

var il = plz.generate_il(ast);
if (debug)
    il.dump();

var ilx = new CodeGenX86(il);
var code = ilx.generate_code();
if (debug)
    console.log(code);

// var ilvm = new PLZ_ILVM(il);
// ilvm.run();

function output_asm(code) {
    var i, c, s;

    console.log("section .text");
    console.log("\tglobal _main");

    for (i = 0; i < code.length; i++) {
	c = code[i];
	if (c[0] == "_label") {
	    console.log(c[1] + ":");
	} else {
	    s = "\t" + c[0];
	    if (c[1] != undefined)
		s += "\t" + c[1];
	    if (c[2] != undefined)
		s += ", " + c[2];

	    console.log(s);
	}
    }
}

output_asm(code);
