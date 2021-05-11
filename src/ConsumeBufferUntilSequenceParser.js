const assert = require('assert');

class ConsumeBufferUntilSequenceParser {
  constructor(byteSequence, maxBytesToSeek) {
    if (byteSequence.length > maxBytesToSeek) {
      throw new Error('maxBytesToSeek must be greater than byteSequence length');
    }

    this._accumulatedSequence = [];
    this._byteSequence = byteSequence;
    // We keep this around as a safety mechanism to fail if it seems like we're going to consume indefinitely
    this._maxBytesToSeek = maxBytesToSeek;
    this._numBytesConsumed = 0;
  }

  parse(data) {
    let dataConsumed = 0;
    let nextCharacter;

    const consumeBytes = (numBytes) => {
      dataConsumed += numBytes;
      this._numBytesConsumed += numBytes;
      assert(this._numBytesConsumed <= this._maxBytesToSeek, 'Should not consume more than expected bytes');
    };

    while (dataConsumed < data.length && (nextCharacter = this._byteSequence[this._accumulatedSequence.length]) !== undefined) {
      const indexOfNextCharacter = data.indexOf(nextCharacter, dataConsumed);
      if (indexOfNextCharacter === -1) {
        consumeBytes(data.length - dataConsumed);
        if (this._accumulatedSequence.length) {
          // we're not actually in a hit, reset the accumulatedSequence
          this._accumulatedSequence = [];
        }

        continue;
      }

      consumeBytes(indexOfNextCharacter + 1 - dataConsumed);
      this._accumulatedSequence.push(nextCharacter);
    }

    return {
      finished: this._accumulatedSequence.length === this._byteSequence.length,
      remaining: data.slice(dataConsumed)
    };
  }
}

module.exports = ConsumeBufferUntilSequenceParser;
