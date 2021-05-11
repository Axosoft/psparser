const toObject = (buffer) => {
  const o = JSON.parse(buffer);
  return {
    content: o.Content,
    type: o.Type,
    start: o.Start,
    length: o.Length,
    startLine: o.StartLine,
    startColumn: o.StartColumn,
    endLine: o.EndLine,
    endColumn: o.EndColumn
  };
};
const DELIMITER = 0;
class TokenStreamParser {
  constructor() {
    // Only set once we've found the first DELIMITER in the input data
    this._startedParsing = false;
    this._completed = false;
    this._tokens = [];
    this._storedBuffer = Buffer.alloc(0);
  }

  // Returns true if parse is deemed complete, false if we need more input to finish the parse
  parse(data) {
    if (this._completed) {
      return true;
    }

    let currentIndex = 0;
    if (this._storedBuffer.length) {
      // we're continuing a parse
      currentIndex = data.indexOf('}');
      if (currentIndex === -1) {
        // Assume that the entire buffer is just additional to the currently accumulating JSON object
        this._storedBuffer = Buffer.concat([this._storedBuffer, data]);
        if (data.indexOf(DELIMITER) !== -1) {
          // we did not receive a bracket before receiving the terminating character code
          // we don't ever expect to see this behavior, but we shouldn't get stuck if we see it
          throw new Error('TokenStreamParser received unexpected end to input buffer');
        }

        return false;
      } else {
        currentIndex++; // consume the bracket
        this._tokens.push(toObject(Buffer.concat([this._storedBuffer, data.slice(0, currentIndex)])));
        this._storedBuffer = Buffer.alloc(0);
        if (currentIndex === data.length) {
          // we've consumed the entire buffer, but haven't received a terminating signal
          return false;
        }
      }
    }

    while (currentIndex < data.length) {
      const indexOfStartingBracket = data.indexOf('{', currentIndex);
      if (indexOfStartingBracket === -1) {
        // there is likely nothing of interest in this buffer
        // check for a possible terminating condition
        if (data.indexOf(DELIMITER, currentIndex) !== -1) {
          return (this._completed = true);
        }

        return false;
      }

      const indexOfEndingBracket = data.indexOf('}', indexOfStartingBracket);
      if (indexOfEndingBracket === -1) {
        if (data.indexOf(DELIMITER, indexOfStartingBracket) !== -1) {
          // we did not receive a bracket before receiving the terminating character code
          // we don't ever expect to see this behavior, but we shouldn't get stuck if we see it
          throw new Error('PSParser returned incomplete data');
        }

        // We've parsed _some part_ of a JSON object. Let's store it for later and bail
        this._storedBuffer = data.slice(indexOfStartingBracket);
        return false;
      }

      currentIndex = indexOfEndingBracket + 1; // consume the bracket
      this._tokens.push(toObject(data.slice(indexOfStartingBracket, currentIndex)));
    }

    // if we've reached this point, we've consumed the entire buffer, but without finding a terminating
    // condition, we have no buffer to store, and we must wait until the next data event arrives
    return false;
  }

  getTokens() {
    if (this._completed) {
      return this._tokens;
    } else {
      throw new Error('TokenStreamParser has not consumed all necessary data from the stream');
    }
  }
}

module.exports = TokenStreamParser;
