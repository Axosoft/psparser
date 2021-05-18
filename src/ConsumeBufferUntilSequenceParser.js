class ConsumeBufferUntilSequenceParser {
  constructor(byteSequence) {
    this._accumulatedSequence = [];
    this._byteSequence = byteSequence;
  }

  parse(data, parseStart = 0) {
    const firstCharacter = this._byteSequence[0];
    let dataIndex = parseStart;
    let nextCharacter;

    while (
      dataIndex < data.length
      && (nextCharacter = this._byteSequence[this._accumulatedSequence.length]) !== undefined
    ) {
      const thisCharacter = data[dataIndex++];
      if (thisCharacter === nextCharacter) {
        this._accumulatedSequence.push(nextCharacter);
      } else if (thisCharacter === firstCharacter) {
        // we're not actually in a hit, reset the accumulatedSequence
        this._accumulatedSequence = [firstCharacter];
      } else if (this._accumulatedSequence.length) {
        this._accumulatedSequence = [];
      }
    }

    return {
      done: this._accumulatedSequence.length === this._byteSequence.length,
      nextIndex: dataIndex
    };
  }
}

module.exports = ConsumeBufferUntilSequenceParser;
