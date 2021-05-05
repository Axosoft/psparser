# PSParser
This package shells out to the [PSParser](https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.psparser?view=powershellsdk-7.0.0) utility in Powershell to tokenize powershell input. It currently only works on Windows, though it shouldn't be hard to add support for any platform that supports Powershell.

## Usage
```javascript
const psparser = require('psparser');
const main = async () => {
  const tokens = await psparser('echo hello');
  // work with tokens :)
};
```

## General output
This library directly translates the output of [PSParser](https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.psparser?view=powershellsdk-7.0.0).

Tokens will be an array containing objects of the following type:
```typescript
type TokenType
  = 'Attribute'
  | 'Command'
  | 'CommandArgument'
  | 'CommandParameter'
  | 'Comment'
  | 'GroupEnd'
  | 'GroupStart'
  | 'Keyword'
  | 'LineContinuation'
  | 'LoopLabel'
  | 'Member'
  | 'NewLine'
  | 'Number'
  | 'Operator'
  | 'Position'
  | 'StatementSeparator'
  | 'String'
  | 'Type'
  | 'Unknown'
  | 'Variable'
  ;
interface Token {
  content: string;
  type: TokenType;
  start: number;
  length: number;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}
```
