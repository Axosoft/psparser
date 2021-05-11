const assert = require('assert');

const TokenStreamParser = require('../src/TokenStreamParser');

const capitalizeKeysInObjectArray = (a) => a.map((o) => {
  const result = {};
  for (const key of Object.keys(o)) {
    result[key[0].toUpperCase() + key.substring(1)] = o[key];
  }
  return result;
});

const toTestOutputBuffer = inputObject =>
  Buffer.from(
    JSON.stringify(capitalizeKeysInObjectArray(inputObject), null, 2)
      .replace(/\n/g, '\r\n')
  );

const expectedTokens = [
  {
    content: 'echo',
    type: 1,
    start: 0,
    length: 4,
    startLine: 1,
    startColumn: undefined,
    endLine: 1,
    endColumn: undefined
  },
  {
    content: 'hello',
    type: 3,
    start: 5,
    length: 5,
    startLine: 1,
    startColumn: undefined,
    endLine: 1,
    endColumn: undefined
  },
  {
    content: 'world',
    type: 3,
    start: 10,
    length: 6,
    startLine: 1,
    startColumn: undefined,
    endLine: 1,
    endColumn: undefined
  }
];
const testBuffer = Buffer.from(`\r\n\r\n${toTestOutputBuffer(expectedTokens)}\r\n\0\r\n`);

const tests = [
  function test_BufferContainsAllData() {
    const tokenStreamParser = new TokenStreamParser();
    assert.ok(tokenStreamParser.parse(testBuffer), 'Should have completed parsing');
    assert.deepEqual(tokenStreamParser.getTokens(), expectedTokens);
  },

  function test_SplitOnObjectBoundary() {
    const firstBuffer = testBuffer.slice(0, 50);
    const secondBuffer = testBuffer.slice(50, 200);
    const thirdBuffer = testBuffer.slice(200);
    const tokenStreamParser = new TokenStreamParser();
    assert.ok(!tokenStreamParser.parse(firstBuffer), 'Should not have completed parsing');
    assert.throws(() => tokenStreamParser.getTokens(), 'Should have thrown, because parsing is not done');
    assert.ok(!tokenStreamParser.parse(secondBuffer), 'Should not have completed parsing');
    assert.throws(() => tokenStreamParser.getTokens(), 'Should have thrown, because parsing is not done');
    assert.ok(tokenStreamParser.parse(thirdBuffer), 'Should have completed parsing');
    assert.deepEqual(tokenStreamParser.getTokens(), expectedTokens);
  },

  function test_AsManyBuffersAsCharacters() {
    const tokenStreamParser = new TokenStreamParser();
    let i;
    for (i = 0; i < testBuffer.length - 3; ++i) {
      assert.ok(!tokenStreamParser.parse(testBuffer.slice(i, i + 1)));
    }

    assert.throws(() => tokenStreamParser.getTokens(), 'Should have thrown, because parsing is not done');
    assert.ok(tokenStreamParser.parse(testBuffer.slice(i, ++i)));
    assert.deepEqual(tokenStreamParser.getTokens(), expectedTokens);

    for (; i < testBuffer.length; ++i) {
      assert.ok(tokenStreamParser.parse(testBuffer.slice(i, i + 1)));
    }

    assert.deepEqual(tokenStreamParser.getTokens(), expectedTokens);
  },

  function test_EarlyTerminationConditions() {
    let tokenStreamParser = new TokenStreamParser();
    assert.throws(() => tokenStreamParser.parse(Buffer.from('{"test": \0')), 'Should have thrown, because input was malformed');
    tokenStreamParser = new TokenStreamParser();
    assert.ok(!tokenStreamParser.parse(Buffer.from('{"test": ')), 'Should not have completed parsing');
    assert.throws(() => tokenStreamParser.parse(Buffer.from('\0')), 'Should have thrown, because input was malformed');
  }
]

tests.forEach(test => test());
