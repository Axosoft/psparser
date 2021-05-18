const ConsumeBufferUntilSequenceParser = require('./ConsumeBufferUntilSequenceParser');

class AccumulateBufferUntilSequenceParser extends ConsumeBufferUntilSequenceParser {
  constructor(byteSequence) {
    super(byteSequence);
    this._buffer = Buffer.alloc(0);
  }

  parse(data, parseStart = 0) {
    const { done, nextIndex } = super.parse(data, parseStart);

    this._buffer = Buffer.concat([this._buffer, data.slice(parseStart, nextIndex)]);

    return done;
  }

  getBuffer() {
    if (this._accumulatedSequence.length !== this._byteSequence.length) {
      throw new Error('Have not finished accumulating buffer yet.');
    }

    return this._buffer.slice(0, this._buffer.length - this._byteSequence.length);
  }
}

module.exports = AccumulateBufferUntilSequenceParser;
