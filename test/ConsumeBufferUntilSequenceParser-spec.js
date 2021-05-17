const assert = require('assert');

const ConsumeBufferUntilSequenceParser = require('../src/ConsumeBufferUntilSequenceParser');

let byteSequence;

const tests = [
  function test_EntireContentIsInBuffer() {
    const consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(byteSequence, 100);
    const bufferToParse = Buffer.concat([
      Buffer.from('hello how are you doing\n'),
      byteSequence
    ]);
    assert.deepEqual(
      consumeBufferUntilSequence.parse(bufferToParse),
      { done: true, nextIndex: bufferToParse.length }
    );
  },

  function test_BufferIsSplit() {
    const consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(byteSequence, 100);
    let bufferToParse = Buffer.from('hello how are you doing\n');
    assert.deepEqual(
      consumeBufferUntilSequence.parse(bufferToParse),
      { done: false, nextIndex: bufferToParse.length }
    );
    bufferToParse = Buffer.concat([
      Buffer.from('testing all of the things'),
      byteSequence
    ]);
    assert.deepEqual(
      consumeBufferUntilSequence.parse(bufferToParse),
      { done: true, nextIndex: bufferToParse.length }
    );
  },

  function test_BufferIsHighlySplit() {
    const testBuffer = Buffer.concat([
      Buffer.from('Take me to the moon\n\n\r\nWhatever'),
      byteSequence
    ]);

    const consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(byteSequence, 100);
    let i;
    for (i = 0; i < testBuffer.length - 1; ++i) {
      assert.deepEqual(
        consumeBufferUntilSequence.parse(testBuffer.slice(i, i + 1)),
        { done: false, nextIndex: 1 }
      );
    }

    assert.deepEqual(
      consumeBufferUntilSequence.parse(testBuffer.slice(i, i + 1)),
      { done: true, nextIndex: 1 }
    )
  },

  function test_BufferHasContentLeftOver() {
    const consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(byteSequence, 100);
    const discardBuffer = Buffer.concat([
      Buffer.from('hello how are you doing\n'),
      byteSequence
    ]);
    const bufferToParse = Buffer.concat([
      discardBuffer,
      Buffer.from('but why male models?')
    ]);
    assert.deepEqual(
      consumeBufferUntilSequence.parse(
        bufferToParse
      ),
      { done: true, nextIndex: discardBuffer.length }
    );
  }
];

byteSequence = Buffer.from('\0');
tests.forEach(test => test());
byteSequence = Buffer.from('\n\0==PSParserBeginParse==\0\n');
tests.forEach(test => test());
