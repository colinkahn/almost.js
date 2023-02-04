var ICounted = Protocol('ICounted', ['count']);

ICounted.extend(Array, {count: (arr) => arr.length});

console.log(ICounted.count([1,2,3]));

var obj = {items: 10};

ICounted.specify(obj, {count: (obj) => obj.items});

console.log(ICounted.count(obj));

console.log(ICounted.satisfies(obj));
console.log(ICounted.satisfies([1,2,3]));
console.log(ICounted.satisfies({}));


var a = Namespace('Almost.Core');

console.log('get foo = 1', a.get({foo: 1}, 'foo'));

const data = [-2, -1, 0, 1, 2, 3];
var xf = a.compose(a.filter(a.pos), a.map(a.inc));
console.log(a.transduce(xf, a.conj, data))

const m = new Map([['foo', 1], ['bar', 2]]);
var xf = a.map(a.identity);
console.log(a.transduce(xf, a.conj, m));
// this could be a good round trip property test
console.log(a.into([], new Map([['foo', 1], ['bar', 2]])))
console.log(a.into(new Map(), [['foo', 1], ['bar', 2]]))
console.log(a.into(new Map([['baz', 3]]), new Map([['foo', 1], ['bar', 2]])))

console.log(a.binding(
	{'Almost.Core.conj': function() { return 10; }},
	function() { return a.conj(); }
));

a.IEquiv.extend(Array, {'equiv': function(arr, other) {
	return arr[0] == other[0];
}});

console.log(a.equiv([1,2,3], [1,4,5]));

console.log(a.getIn({foo: {bar: 2}}, ['foo', 'bar']))

console.log(a.get(document, ['div']));

a.into([], html.queryAll('*'), document);

// todos
//
//
//
//

