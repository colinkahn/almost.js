(function() {
	var IEquiv = Protocol('IEquiv', ['equiv']);
	var ICollection = Protocol('ICollection', ['conj', 'disj']);
	var IDeref = Protocol('IDeref', ['deref']);
	var ITransducer = Protocol('ITransducer', ['init', 'step', 'result']);
	var ILookup = Protocol('ILookup', ['lookup']);
	var IReduce = Protocol('IReduce', ['reduce']);
	var IIndexed = Protocol('IIndexed', ['nth']);

	var _identity = function(x) {
		return x;
	};

	var _subargs = function(args) {
		var args = Array.prototype.slice.call(args);

		if (arguments.length === 1) {
			return args;
		}

		if (arguments.length === 2) {
			start = arguments[0];
			end = args.length;
		}

		return args.slice(start, end);
	};


	var _compose = function() {
		var fns = Array.prototype.slice.call(arguments);
		var apply = function (arg, fn) {
			return fn(arg);
		};
		return function (initial) {
			return fns.reduceRight(apply, initial);
		};
	};

	function _equiv(x, y, more) {
		if (arguments.length === 1) {
			return true;
		}
		if (arguments.length === 2) {
			if (x == null) {
				return y == null;
			} else {
				return x === y || IEquiv.equiv(x, y);
			}
		}

		for (var i = 2; i < arguments.length; i++) {
			if (_equiv(x, y)) {
				return false;
			}
			x = y;
			y = arguments[i];
		}
		return _equiv(x, y);
	}

	var _inc = function(n) {
		return n + 1;
	};

	var _dec = function(n) {
		return n - 1;
	};

	var _pos = function(n) {
		return n > 0;
	};

	var _neg = function(n) {
		return n < 0;
	};

	var _reify = function() {
		var obj = {};
		for (var i = 0; i < arguments.length; i += 2) {
			var protocol = arguments[i];
			var impls = arguments[i + 1];
			protocol.specify(obj, impls);
		}
		return obj;
	};

	var _get = function(obj, key) {
		return ILookup.lookup(obj, key);
	};

	ILookup.extend(Object, {lookup: function(obj, key) { return obj[key]; }});

	var _deref = function(obj) {
		return IDeref.deref(obj);
	};

	var _conj = function() {
		var coll = arguments[0];

		if (arguments.length === 0) {
			return [];
		}

		if (arguments.length === 1) {
			return coll;
		}

		for (var i = 1; i < arguments.length; i++) {
			coll = ICollection.conj(coll, arguments[i]);
		}

		return coll;
	};

	var _disj = function() {
		var coll = arguments[0];

		if (arguments.length === 0) {
			return [];
		}

		if (arguments.length === 1) {
			return coll;
		}

		for (var i = 1; i < arguments.length; i++) {
			coll = ICollection.disj(coll, arguments[i]);
		}

		return coll;
	};

	ICollection.extend(Array, {
		conj: function(arr, value) { arr.push(value); return arr; },
		disj: function(arr, index) { arr.split(index, 1); return arr; }
	});

	ICollection.extend(Map, {
		conj: function(map, value) {
			if (Array.isArray(value)) {
				map.set(value[0], value[1]);
			} else if (value instanceof Map) {
				value.forEach((v, k) => map.set(k, v));
			}
			return map;
		},
		disj: function(map, key) {
			map.delete(key);
			return map;
		}
	});


	function Reduced(value) {
		this.value = value;
	};

	var _reduce = function(f, init, coll) {
		if (arguments.length === 2) {
			coll = init;
			init = ITransducer.init(f);
		}

		var reducer = function(acc, val) { return ITransducer.step(f, acc, val); };
		var state = IReduce.reduce(coll, reducer, init);

		return ITransducer.result(f, state);
	};

	var _getIn = function(obj, keys) {
		return _reduce(_get, obj, keys);
	};

	var _arrayReduce = function(arr, f, init) {
		var acc = init;
		for (var i = 0; i < arr.length; i++) {
			var val = arr[i];
			acc = f(acc, val);

			if (acc != null && acc instanceof Reduced) {
				acc = _deref(acc);
				break;
			}
		}
		return acc;
	};

	var _iterator = function(obj) {
		if (typeof obj[Symbol.iterator] === "function") {
			return obj[Symbol.iterator]();
		} else if (typeof obj === "object" && typeof obj.next === "function") {
			return obj;
		}
		return undefined;
	};

	function _iterableReduce(iter, f, init) {
		var acc = init;
		var iterator = _iterator(iter);
		var val = iterator.next();

		while (!val.done) {
			acc = f(acc, val.value);

			if (acc != null && acc instanceof Reduced) {
				acc = _deref(acc);
				break;
			}

			val = iterator.next();
		}

		return acc;
	};

	IReduce.extend(Array, {reduce: _arrayReduce});
	IReduce.extend(Map, {reduce: _iterableReduce});

	var _transduce = function(xf, f, init, coll) {
		if (arguments.length === 3) {
			coll = init;
			init = ITransducer.init(f);
		}
		return _reduce(xf(f), init, coll);
	};

	var _constantly = function(value) {
		return function() {
			return value;
		};
	};

	var _into = function(to, xf, from) {
		if (arguments.length === 0) {
			return [];
		}
		if (arguments.length === 1) {
			return to;
		}
		if (arguments.length === 2) {
			from = xf;
			return _reduce(_conj, to, from);
		}
		return _transduce(xf, _conj, to, from);
	};

	var _away = function(to, xf, from) {
		if (arguments.length === 0) {
			return [];
		}
		if (arguments.length === 1) {
			return to;
		}
		if (arguments.length === 2) {
			from = xf;
			return _reduce(_disj, to, from);
		}
		return _transduce(xf, _disj, to, from);
	};

	var _sink = function(xf, coll) {
		return _reduce(xf(_constantly(null)), null, coll);
	};

	var _filter = function(predicate, next) {
		if (arguments.length === 1) {
			return function(_next) {
				return _filter(predicate, _next);
			};
		}
		return _reify(ITransducer, {
			init: function(self) {
				return ITransducer.next(next);
			},
			result: function(self, state) {
				return ITransducer.result(next, state);
			},
			step: function(self, state, value) {
				if (predicate(value)) {
					return ITransducer.step(next, state, value);
				}
				return state;
			}
		});
	};

	var _map = function(f, next) {
		if (arguments.length === 1) {
			return function(_next) {
				return _map(f, _next);
			};
		}
		return _reify(ITransducer, {
			init: function(self) {
				return ITransducer.next(next);
			},
			result: function(self, state) {
				return ITransducer.result(next, state);
			},
			step: function(self, state, value) {
				return ITransducer.step(next, state, f(value));
			}
		});
	};

	IDeref.extend(Reduced, {deref: function(reduced) { return reduced.value; }});

	ITransducer.extend(Function, {
		init: function(f) {
			return f();
		},
		result: function(f, state) {
			return state;
		},
		step: function(f, state, value) {
			return f(state, value);
		}
	});

	var _binding = function(bindings, cb) {
		var backup = {};

		for (var key in bindings) {
			if(bindings.hasOwnProperty(key)) {
				var keys = key.split('.'),
					target = window,
					len = keys.length;

				for (var i = 0; i < len - 1; i++) {
					target = target[keys[i]];
				}

				backup[key] = target[keys[len - 1]];
				target[keys[len - 1]] = bindings[key];
			}
		}

		var result = cb();

		for (var key in bindings) {
			if(bindings.hasOwnProperty(key)) {
				var keys = key.split('.'),
					target = window,
					len = keys.length;

				for (var i = 0; i < len - 1; i++) {
					target = target[keys[i]];
				}

				target[keys[len - 1]] = backup[key];
			}
		}

		return result;
	};

	Namespace('Almost.Core', {
		// protocols
		IEquiv,
		ICollection,
		IDeref,
		ITransducer,
		ILookup,
		IReduce,

		//types
		Reduced,

		// functions
		subargs: _subargs,
		identity: _identity,
		equiv: _equiv,
		compose: _compose,
		inc: _inc,
		dec: _dec,
		pos: _pos,
		neg: _neg,
		get: _get,
		getIn: _getIn,
		reify: _reify,
		transduce: _transduce,
		into: _into,
		away: _away,
		deref: _deref,
		conj: _conj,
		disj: _disj,
		reduce: _reduce,
		filter: _filter,
		sink: _sink,
		map: _map,
		binding: _binding,

		// impl
		_arrayReduce
	});
})();
