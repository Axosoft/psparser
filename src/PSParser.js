const { spawn } = require('child_process');
const path = require('path');

const ConsumeBufferUntilSequenceParser = require('./ConsumeBufferUntilSequenceParser');
const TokenStreamParser = require('./TokenStreamParser');

// We do not store this as a separate file to have powershell call
// so that we can workaround Powershell execution policy. If the wrong
// policy is set on a computer, we will not be able to run this script
// but there is nothing that prevents us from sending the raw commands
// of the script directly to powershell.
const PS1ParserScript = `function GetStdinUntilFlag([String] $delimiter) {
  $lines = while (($line = read-host) -cne $delimiter) { $line }
  return $lines -join "\`r\`n"
}

while ($true) {
  $nextCommand = GetStdinUntilFlag("\`0==PSParserBeginParse==\`0");
  $errors = $null;
  [Management.Automation.PSParser]::Tokenize($nextCommand, [ref]$errors) | ConvertTo-Json | Write-Host;
  Write-Host "\`0";
}
`;

class CancelError extends Error {
  constructor(msg) {
    super(msg);
    this.cancelled = true;
  }
}

class DisposeError extends Error {
  constructor(msg) {
    super(msg);
    this.disposed = true;
  }
}

const MAX_RETRIES = 5;
const psParserImpl = () => {
  // When we are marked as disposed, we track the reason so that we can relay that to caller
  let disposedReason = null;
  // Used to track number of consecutive times we've had to restart the parser process
  // if it ever grows to MAX_RETRIES, we dispose the entire PSParser instance.
  // Only a successful parse can reset this value
  let failureRetryCount = 0;
  // We remember up to one parse request at a time, we'll continue to cancel existing queuedParseRequests
  // in favor of the most recent request until the queuedParseRequest is sent to the parserProces
  let queuedParseRequest = null;
  let parserProcess = null;

  function setDisposedReason(disposeReason) {
    disposedReason = new DisposeError(disposeReason);
  }

  // Note this only releases handles that we have attached to an already dead process
  function cleanupDeadParserProcess() {
    if (parserProcess) {
      parserProcess.stdout.removeAllListeners();
      parserProcess.removeAllListeners();
      parserProcess = null;
    }
  }

  function makeParserProcess() {
    parserProcess = spawn(
      PS1ParserScript,
      { shell: 'powershell.exe', stdio: 'pipe' }
    );
    parserProcess.on('close', () => {
      if (parserProcess.listenerCount('close') > 1) {
        // If there is more than one close handler registered, we should delegate to next handler so that it
        // can restart the active parse request or cleanup the dead process. That handler contains the only
        // reference to the reject function of the active parse request.
        return;
      }

      cleanupDeadParserProcess();

      if (disposedReason) {
        return;
      }

      if (failureRetryCount >= MAX_RETRIES) {
        setDisposedReason(`PSParser was unable to parse the output within ${MAX_RETRIES} retries`);
        return;
      }

      failureRetryCount++;
      makeParserProcess();
    });
  }

  function cancelQueuedParseRequest() {
    if (!queuedParseRequest) {
      return false;
    }

    queuedParseRequest.reject(new CancelError('Request cancelled'));
    queuedParseRequest = null;

    return true;
  }

  function disposeQueuedParseRequest() {
    if (queuedParseRequest) {
      queuedParseRequest.reject(disposedReason);
      queuedParseRequest = null;
    }
  }

  function startQueuedParseRequest() {
    if (queuedParseRequest) {
      runExchangeWithChildProcess(queuedParseRequest.inputCodeBlob, queuedParseRequest.resolve, queuedParseRequest.reject);
      queuedParseRequest = null;
    }
  }

  function runExchangeWithChildProcess(inputCodeBlob, resolve, reject) {
    function handleUnexpectedClose() {
      cleanupDeadParserProcess();

      if (disposedReason) {
        reject(disposedReason);
        disposeQueuedParseRequest();
        return;
      }

      if (failureRetryCount >= MAX_RETRIES) {
        setDisposedReason(`PSParser was unable to parse the output within ${MAX_RETRIES} retries`);
        reject(disposedReason);
        disposeQueuedParseRequest();
        return;
      }

      failureRetryCount++;
      makeParserProcess();
      runExchangeWithChildProcess(inputCodeBlob, resolve, reject);
    };
    parserProcess.on('close', handleUnexpectedClose);

    const tokenStreamParser = new TokenStreamParser();
    const inputTerminator = '\n\0==PSParserBeginParse==\0\n';
    const input = `${inputCodeBlob}${inputTerminator}`;
    // Because we feed the powershell script directly into PS
    // we cannot get rid of the `echo` that occurs when calling read-host
    // so we need a mechanism that can discard anything in stdout
    // up until a point we would logically say is the intended safe
    // zone for parsing.
    let consumeBufferUntilSequence = new ConsumeBufferUntilSequenceParser(
      Buffer.from(inputTerminator),
      input.length + 1
    );

    parserProcess.stdout.on('data', (incomingData) => {
      let data = incomingData;
      if (consumeBufferUntilSequence) {
        const { finished, remaining } = consumeBufferUntilSequence.parse(incomingData);
        if (finished) {
          consumeBufferUntilSequence = null;
        }

        if (remaining.length === 0) {
          return;
        }

        data = remaining;
      }

      let done;
      try {
        done = tokenStreamParser.parse(data);
        if (done) {
          failureRetryCount = 0;
          resolve(tokenStreamParser.getTokens());
        }
      } catch (error) {
        done = true;
        reject(error);
      }

      if (done) {
        parserProcess.stdout.removeAllListeners('data');
        parserProcess.off('close', handleUnexpectedClose);
        startQueuedParseRequest();
      }
    });

    parserProcess.stdin.write(input);
  };

  makeParserProcess();

  return {
    dispose() {
      if (disposedReason) {
        return;
      }

      setDisposedReason('PSParser has been disposed');
      if (parserProcess) {
        // if there is a parserProcess, it must be in the state of waiting for requests
        // or handling a request
        // no matter the state, kill it and let it clean up any active requests in the close event handlers
        // close is a reliable event, it is always called even if a child process fails to spawn
        parserProcess.kill();
      }
    },
    parse(inputCodeBlob) {
      if (disposedReason) {
        return Promise.reject(disposedReason);
      }

      if (cancelQueuedParseRequest()) {
        queuedParseRequest = { inputCodeBlob };
        return new Promise((resolve, reject) => {
          queuedParseRequest.resolve = resolve;
          queuedParseRequest.reject = reject;
        });
      }

      return new Promise((resolve, reject) => {
        runExchangeWithChildProcess(inputCodeBlob, resolve, reject);
      });
    }
  };
};

class PSParser {
  constructor() {
    if (process.platform === 'win32') {
      this._impl = psParserImpl();
    }
  }

  dispose() {
    if (!this._impl) {
      throw new Error('No implementation for platform');
    }

    this._impl.dispose();
  }

  async parse(inputCodeBlob) {
    if (!this._impl) {
      throw new Error('No implementation for platform');
    }

    return this._impl.parse(inputCodeBlob);
  }

  static TOKEN_TYPE = {
    Attribute: 9,
    Command: 1,
    CommandArgument: 3,
    CommandParameter: 2,
    Comment: 15,
    GroupEnd: 13,
    GroupStart: 12,
    Keyword: 14,
    LineContinuation: 18,
    LoopLabel: 8,
    Member: 7,
    NewLine: 17	,
    Number: 4,
    Operator: 11,
    Position: 19,
    StatementSeparator: 16,
    String: 5,
    Type: 10,
    Unknown: 0,
    Variable: 6
  };
}

module.exports = PSParser;
