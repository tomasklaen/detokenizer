# detokenizer

Replace tokens in a string based on token value map.

Supports dynamic tokens (regular expressions), and sync & async replacer functions.

## Install

```
npm install detokenizer
```

### Examples

Basic:

```ts
const {detokenize} = require('detokenizer');

detokenize('Hello {name}!', {'{name}': 'John'});
// => 'Hello John!'
```

Dynamic tokens:

```ts
detokenize('Hello {name}! Your email is {emoji:envelope} {email}.', [
  ['{name}', 'John'],
  ['{email}', 'john@example.com'],
  [/{emoji:(?<id>[a-z0-9]+)}/i, (token, match) => match.groups.id === 'envelope' ? '✉️' : '']
]);
// => 'Hello John! Your email is ✉️ john@example.com.'
```

Async:

```ts
const {detokenizeAsync} = require('detokenizer');

// Transform issue ids into anchor links with titles
await detokenizeAsync('Issue #42', [
  [
    /#(?<id>\d+)/,
    async (token, match) => {
      const issueTitle = await retrieveIssueTitle(match.groups.id);
      return `<a href="..." title="${issueTitle}">#${match.groups.id}</a>`;
    }
  ]
]);
// => 'Issue <a href="..." title="Issue title">#42</a>'
```

Token escaping:

*Add escape sequences to be replaced out as last tokens. (use dynamic tokens (regular expressions) for more advanced replacing)*

```ts
detokenize('\{foo\} value is {foo}', {
  '{foo}': 'bar',
  '\\{': '{',
  '\\}': '}',
});
// => '{foo} value is bar'
```

## API

Exports:

### `detokenize(input, values)`

Parameters:

#### `input: string`

A string to run the replacer on.

#### `values: Record<string, string | number | Replacer> | Array<[string | RegExp, string | number | Replacer]>`

Values to substitute tokens with.

It can either be a basic `key: value` object:

```ts
detokenize('...', {
  foo: 'value',
  bar: (token) => `you used ${token} token`
});
```

Or if you want the dynamic tokens support, an array of map like entries:

```ts
detokenize('...', [
  ['foo', 'value'],
  [/bar/i, (token, match) => `you used ${match[0]} token`]
]);
```

##### `Replacer`

If assigned to a string token, replacer is:

```ts
(token: string) => string | number;
```

If assigned to a RegExp token, it is:

```ts
(token: RegExp, match: RegExpExecArray) => string | number;
```

Example.

```ts
const emojis = {
  envelope: '✉️',
  // ...
}

const emojiToken = /{emoji:(?<id>[a-z0-9]+)}/i;

function emojiReplacer(token, match) {
  return emojis[match.groups.id] || '';
}

detokenize('{emoji:envelope}', [[emojiToken, emojiReplacer]]);
```

### `detokenizeAsync(input, values): Promise<string>`

Same API as sync version, but `Replacer` can return a promise that resolves with a `string` or a `number`.

```ts
// Transform issue ids into anchor links with titles
await detokenizeAsync('Issue #42', [
  [
    /#(?<id>\d+)/,
    async (token, match) => {
      const issueTitle = await retrieveIssueTitle(match.groups.id);
      return `<a href="..." title="${issueTitle}">#${match.groups.id}</a>`;
    }
  ]
]);
// => 'Issue <a href="..." title="Issue title">#42</a>'
```
