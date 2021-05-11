# PSParser
This package shells out to the [PSParser](https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.psparser?view=powershellsdk-7.0.0) utility in Powershell to tokenize powershell input. It currently only works on Windows, though it shouldn't be hard to add support for any platform that supports Powershell.

## Usage
When parsing repeatedly, keep an instance of PSParser alive until you are done parsing. PSParser spins up a child process and keeps it alive for performance. After you are done with all parsing work, dispose of PSParser to free the child process.
```javascript
const PSParser = require('psparser');
const main = async () => {
  const psParser = new PSParser();
  const tokens = await psparser.parse('echo hello');
  psParser.dispose(); // always call dispose when you are done with PSPaser.
  // work with tokens :)
};
```

## General output
This library directly translates the output of [PSParser](https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.psparser?view=powershellsdk-7.0.0).

Tokens will be an array containing objects of the following type:
```typescript
enum TokenType {
  Attribute = 9,
  Command = 1,
  CommandArgument = 3,
  CommandParameter = 2,
  Comment = 15,
  GroupEnd = 13,
  GroupStart = 12,
  Keyword = 14,
  LineContinuation = 18,
  LoopLabel = 8,
  Member = 7,
  NewLine = 17	,
  Number = 4,
  Operator = 11,
  Position = 19,
  StatementSeparator = 16,
  String = 5,
  Type = 10,
  Unknown = 0,
  Variable = 6
};

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

You can access `TOKEN_TYPE` enum directly off of `PSParser.TOKEN_TYPE`.
