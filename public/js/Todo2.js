var core = Namespace('Almost.Core');

core.IReduce.extend(NodeList, {reduce: core._arrayReduce});

core.ICollection.extend(DOMTokenList, {
	conj: function(list, value) { list.add(value); return list; },
	disj: function(list, value) { list.remove(value); return list; }
});

core.ICollection.extend(Node, {
	conj: function(el, value) {
		if (Array.isArray(value)) {
			el.setAttribute(value[0], value[1]);
		} else if (value instanceof HTMLElement) {
			el.appendChild(value);
		}
		return el;
	},
	disj: function(el, value) {
		if (typeof value === 'string') {
			el.removeAttribute(value);
		} else if (value instanceof HTMLElement) {
			el.removeChild(value);
		}
		return el;
	}
});

class EditableText extends HTMLElement {
	constructor() {
		super();

		this._text = '';
		this._editing = false;

		this._display = document.createElement('div');
		this._input = document.createElement('input');

		this._input.style.display = 'none';


		this._display.addEventListener('dblclick', () => {
			this._startEditing();
		});

		this._input.addEventListener('keyup', (event) => {
			if (event.key === 'Enter') {
				this._stopEditing();
				this.dispatchEvent(new CustomEvent('text-updated', {
					bubbles: true,
					composed: true,
					detail: {text: this._text}
				}));
			}
		});

		this.attachShadow({ mode: 'open' });
		core.into(this.shadowRoot, [this._display, this._input]);
		//this.shadowRoot.appendChild(this._display);
		//this.shadowRoot.appendChild(this._input);
	}

	static get observedAttributes() {
		return ['text', 'editing'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'text':
				this._text = newValue;
				this._display.textContent = newValue;
				this._input.value = newValue;
			break;
			case 'editing':
				if (newValue === '') {
					this._startEditing();
				} else {
					this._stopEditing();
				}
			break;
		}
	}

	_startEditing() {
		this._editing = true;
		this._input.style.display = 'block';
		this._display.style.display = 'none';
		this._input.focus();
	}

	_stopEditing() {
		this._editing = false;
		this._input.style.display = 'none';
		this._display.style.display = 'block';
		this._text = this._input.value;
		this._display.textContent = this._input.value;
	}

	get text() {
		return this._text;
	}

	set text(value) {
		this._text = value;
		core.conj(this, ['text', value])
		//this.setAttribute('text', value);
	}
}

customElements.define('editable-text', EditableText);

class Todo extends HTMLElement {
	static get observedAttributes() {
		return ['message', 'complete', 'editing'];
	}

	get message() {
		return this.getAttribute('message');
	}

	set message(value) {
		this.setAttribute('message', value);
	}

	get complete() {
		return this.hasAttribute('complete');
	}

	set complete(value) {
		if (value) {
			this.setAttribute('complete', '');
		} else {
			this.removeAttribute('complete');
		}
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `
      <style>
	:host {
	  display: block;
	  padding: 10px;
	}
	input[type="checkbox"] {
	  margin-right: 10px;
	}
      </style>
      <input type="checkbox">
      <editable-text></editable-text>
    `;
		this._checkbox = this.shadowRoot.querySelector('input[type="checkbox"]');
		this._editableText = this.shadowRoot.querySelector('editable-text');
		this._checkbox.addEventListener('change', () => {
			this.complete = this._checkbox.checked;
		});
	}

	connectedCallback() {
		this._checkbox.checked = this.complete;
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'message':
				core.conj(this._editableText, ['text', newValue]);
				//this._editableText.setAttribute('text', newValue);
				break;
			case 'complete':
				this._checkbox.checked = this.complete;
				break;
			case 'editing':
				if (newValue === '') {
					core.conj(this._editableText, ['editing', '']);
				} else {
					core.disj(this._editableText, 'editing');
				}
				break;
		}
	}
}

customElements.define('todo-item', Todo);

class MarkAll extends HTMLElement {
	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
      <button>Mark All</button>
    `;

		const btn = this.querySelector('button');
		btn.addEventListener('click', () => {
			const todoElements = this.parentNode.querySelectorAll('todo-item');
			core.sink(core.map(todo => core.conj(todo, ['complete', true])), todoElements);
			//core.into([], core.map(todo => todo.setAttribute('complete', true)), todoElements);
			//todoElements.forEach(todo => { todo.setAttribute('complete', true); });
		});
	}
}

customElements.define('mark-all', MarkAll);

class ClearCompleted extends HTMLElement {
	connectedCallback() {
		this.render();
	}

	render() {
		this.innerHTML = `
      <button>Clear Completed</button>
    `;

		const btn = this.querySelector('button');
		btn.addEventListener('click', () => {
			const todoElements = this.parentNode.querySelectorAll('todo-item[complete]');
			core.sink(core.map(todo => todo.remove()), todoElements);
			//todoElements.forEach(todo => { todo.remove(); });
		});
	}
}

customElements.define('clear-completed', ClearCompleted);

class RadioGroup extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `
      <style>
	:host {
	  display: inline-block;
	}
	label {
	  cursor: pointer;
	  padding: 4px 8px;
	  margin-right: 8px;
	  border: 1px solid black;
	  border-radius: 4px;
	}
	input[type="radio"]:checked + label {
	  background-color: lightgray;
	}
      </style>
      <input type="radio" id="all" name="status" value="all" checked>
      <label for="all">All</label>
      <input type="radio" id="active" name="status" value="active">
      <label for="active">Active</label>
      <input type="radio" id="complete" name="status" value="complete">
      <label for="complete">Complete</label>
    `;
	}

	connectedCallback() {
		this._render();

		this.shadowRoot.addEventListener("change", e => {
			if (e.target.tagName === "INPUT") {
				const selected = this.shadowRoot.querySelector("input[type='radio']:checked");
				this.dispatchEvent(new CustomEvent("selected", {
					detail: {
						value: selected.value
					}
				}));
			}
		});
	}

	_render() {
		const allInput = this.shadowRoot.querySelector("#all");
		const activeInput = this.shadowRoot.querySelector("#active");
		const completeInput = this.shadowRoot.querySelector("#complete");

		if (this.hasAttribute("value")) {
			const value = this.getAttribute("value");
			if (value === "all") {
				allInput.checked = true;
			} else if (value === "active") {
				activeInput.checked = true;
			} else if (value === "complete") {
				completeInput.checked = true;
			}
		}
	}
}

customElements.define('radio-group', RadioGroup);

class TodoList extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		this.shadowRoot.innerHTML = `
			<style>
				ul {
					list-style: none;
					padding: 0;
				}
				.only-complete todo-item:not([complete]) {
					display: none;
				}
				.only-active todo-item[complete] {
					display: none;
				}
			</style>
			<input type="text">
			<ul></ul>
			<mark-all></mark-all>
			<radio-group value="all"></radio-group>
			<clear-completed></clear-completed>
		`;
	}

	connectedCallback() {
		// Listen for text-updated events
		this._input = this.shadowRoot.querySelector('input[type="text"]');
		this._list = this.shadowRoot.querySelector('ul');
		this._radioGroup = this.shadowRoot.querySelector('radio-group');

		this._radioGroup.addEventListener('selected', event => {
			switch (event.detail.value) {
				case 'all':
					core.disj(this._list.classList, 'only-complete', 'only-active');
				break;
				case 'active':
					//core.disj(this._list.classList, 'only-complete');
					core.away(this._list.classList, ['only-complete']);
					core.into(this._list.classList, ['only-active']);
					//this._list.classList.remove('only-complete');
					//this._list.classList.add('only-active');
				break;
				case 'complete':
					this._list.classList.remove('only-active');
					this._list.classList.add('only-complete');
				break;
			}
		});

		this._input.addEventListener('keyup', event => {
			if (event.key === 'Enter') {
				const todo = document.createElement('todo-item');
				core.conj(todo, ['message', this._input.value]);
				core.disj(todo, 'editing');
				// intercalate? still don't understand how _this_ works though
				this._list.insertBefore(todo, this._list.firstChild);
				this._input.value = '';
			}
		});
	}
}

customElements.define('todo-list', TodoList);

