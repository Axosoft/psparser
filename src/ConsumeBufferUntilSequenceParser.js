const assert = require('assert');

class ConsumeBufferUntilSequenceParser {
  constructor(byteSequence, maxBytesToSeek = -1) {
    if (maxBytesToSeek !== -1 && byteSequence.length > maxBytesToSeek) {
      throw new Error('maxBytesToSeek must be greater than byteSequence length');
    }

    this._accumulatedSequence = [];
    this._byteSequence = byteSequence;
    this._maxBytesToSeek = maxBytesToSeek;
    this._numBytesConsumed = 0;
  }

  parse(data, parseStart = 0) {
    let dataIndex = parseStart;
    let nextCharacter;

    while (dataIndex < data.length && (nextCharacter = this._byteSequence[this._accumulatedSequence.length]) !== undefined) {
      const indexOfNextCharacter = data.indexOf(nextCharacter, dataIndex);
      if (indexOfNextCharacter === -1) {
        dataIndex = data.length;
        if (this._accumulatedSequence.length) {
          // we're not actually in a hit, reset the accumulatedSequence
          this._accumulatedSequence = [];
        }
      } else {
        dataIndex = indexOfNextCharacter + 1;
        this._accumulatedSequence.push(nextCharacter);
      }

      if (this._maxBytesToSeek !== -1) {
        assert(
          this._numBytesConsumed + (dataIndex - parseStart) <= this._maxBytesToSeek,
          'Should not consume more than expected bytes'
        );
      }
    }

    return {
      done: this._accumulatedSequence.length === this._byteSequence.length,
      nextIndex: dataIndex
    };
  }
}

module.exports = ConsumeBufferUntilSequenceParser;
