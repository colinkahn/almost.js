var Protocol = (function() {
	var _typeName = function(instance) {
		if (instance.constructor && instance.constructor.name) {
			return instance.constructor.name;
		}
		return Object.prototype.toString.call(instance).slice(8, -1);
	}

	function Protocol(name, methods, methodSymbolLookup) {
		this.name = name;
		this._symbol = Symbol(name);
		this._methods = methods;
		this._methodSymbolLookup = methodSymbolLookup;
	}

	Protocol.prototype.extend = function(cls, impls) {
		cls.prototype[this._symbol] = true;
		var lookup = this._methodSymbolLookup;
		this._methods.forEach(function(method) {
			cls.prototype[lookup[method]] = impls[method];
		});
	};

	Protocol.prototype.specify = function(obj, impls) {
		obj[this._symbol] = true;
		var lookup = this._methodSymbolLookup;
		this._methods.forEach(function(method) {
			obj[lookup[method]] = impls[method];
		});
	};

	Protocol.prototype.satisfies = function(obj) {
		return !!obj[this._symbol];
	};

	var _protocol = function(name, methods) {
		var methodSymbolLookup = {};
		methods.forEach(function(method) {
			methodSymbolLookup[method] = Symbol(name + '.' + method);
		});
		var protocol = new Protocol(name, methods, methodSymbolLookup);
		methods.forEach(function(method) {
			protocol[method] = function(obj) {
				var symbol = methodSymbolLookup[method];
				if (!obj[symbol]) {
					throw new Error('No implementation of \'' + method + '\' for type ' + _typeName(obj));
				}
				var args = Array.prototype.slice.call(arguments, 1);
				return obj[symbol].apply(obj, [obj].concat(args));
			};
		});
		return protocol;
	};

	return _protocol;
})();
