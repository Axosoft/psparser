const { spawn } = require('child_process');
const path = require('path');

const convertFieldValue = (field, value) => {
  if (field === 'content' || field === 'type') {
    return value.trim();
  }

  return Number.parseInt(value);
};

module.exports = (inputCodeBlob) => new Promise((resolve, reject) => {
  if (process.platform !== 'win32') {
    reject(new Error('Only supported on Windows'));
    return;
  }

  if (!inputCodeBlob) {
    resolve([]);
    return;
  }

  const safeCodeBlob = `'${inputCodeBlob.replace(/'/g, "''")}'`;
  const scriptPath = path.resolve(__dirname, 'parse.ps1');
  const childProcess = spawn(scriptPath, [safeCodeBlob], {
    shell: 'powershell.exe'
  });

  let dataAccumulator = Buffer.from([]);
  childProcess.stdout.on('data', (data) => {
    dataAccumulator = Buffer.concat([dataAccumulator, data]);
  });

  let error;
  childProcess.on('error', e => error = e);

  childProcess.on('close', (code) => {
    if (code !== 0) {
      reject(error);
      return;
    }

    const objectStrings = dataAccumulator.toString('utf8').split('\r\n\r\n');
    const tokens = objectStrings.reduce((_tokens, str) => {
      if (!str) {
        return _tokens;
      }

      const nextObject = str.split('\r\n').reduce((obj, fieldAndValue) => {
        if (!fieldAndValue) {
          return obj;
        }

        const [field, value] = fieldAndValue.split(':');
        const trimmedField = field.trim();
        const camelCaseField = trimmedField[0].toLowerCase() + trimmedField.substr(1);
        obj[camelCaseField] = convertFieldValue(camelCaseField, value);
        return obj;
      }, {});

      _tokens.push(nextObject);
      return _tokens;
    }, []);

    resolve(tokens);
  });
});