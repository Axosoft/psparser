const assert = require('assert');

const ConsumeBufferUntilSequenceParser = require('../src/ConsumeBufferUntilSequenceParser');

let byteSequence;

const tests = [
  function test_EntireContentIsInBuffer() {
    const consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(byteSequence, 100);
    assert.deepEqual(
      consumeBufferUntilSequence.parse(
        Buffer.concat([
          Buffer.from('hello how are you doing\n'),
          byteSequence
        ])
      ),
      { finished: true, remaining: Buffer.alloc(0) }
    );
  },

  function test_BufferIsSplit() {
    const consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(byteSequence, 100);
    assert.deepEqual(
      consumeBufferUntilSequence.parse(Buffer.from('hello how are you doing\n')),
      { finished: false, remaining: Buffer.alloc(0) }
    );
    assert.deepEqual(
      consumeBufferUntilSequence.parse(
        Buffer.concat([
          Buffer.from('testing all of the things'),
          byteSequence
        ])
      ),
      { finished: true, remaining: Buffer.alloc(0) }
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
        { finished: false, remaining: Buffer.alloc(0) }
      );
    }

    assert.deepEqual(
      consumeBufferUntilSequence.parse(testBuffer.slice(i, i + 1)),
      { finished: true, remaining: Buffer.alloc(0) }
    )
  },

  function test_BufferHasContentLeftOver() {
    const consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(byteSequence, 100);
    assert.deepEqual(
      consumeBufferUntilSequence.parse(
        Buffer.concat([
          Buffer.from('hello how are you doing\n'),
          byteSequence,
          Buffer.from('but why male models?')
        ])
      ),
      { finished: true, remaining: Buffer.from('but why male models?') }
    );
  },

  function test_BufferDoesNotContainSequenceAndIsSuperLong() {

  }
];

byteSequence = Buffer.from('\0');
tests.forEach(test => test());
byteSequence = Buffer.from('\n\0==PSParserBeginParse==\0\n');
tests.forEach(test => test());
