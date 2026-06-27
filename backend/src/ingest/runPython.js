'use strict';

const { spawn } = require('child_process');
const path = require('path');

// The backend/ directory is the working directory for all script invocations.
// This keeps the scripts/ relative path stable regardless of where the Node
// process was launched from.
const BACKEND_DIR = path.resolve(__dirname, '..', '..'); // backend/

/**
 * Spawn a Python script and return the parsed JSON it writes to stdout.
 *
 * @param {string} scriptName - filename inside backend/scripts/ (e.g. 'fetch_stocks.py')
 * @param {string[]} args     - positional arguments forwarded to the script
 * @returns {Promise<any>}    - resolves with the parsed JSON payload
 */
function runPython(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || 'python3';
    const scriptPath = path.join('scripts', scriptName);

    const child = spawn(pythonBin, [scriptPath, ...args], {
      cwd: BACKEND_DIR,
      // Inherit the current environment so any PYTHONPATH or proxy settings
      // configured by the host are available inside the script.
      env: process.env,
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

    child.on('close', (code) => {
      const stderr = Buffer.concat(stderrChunks).toString().trim();

      if (code !== 0) {
        const msg = `${scriptName} exited with code ${code}.${stderr ? ' stderr: ' + stderr : ''}`;
        return reject(new Error(msg));
      }

      const stdout = Buffer.concat(stdoutChunks).toString().trim();
      if (!stdout) {
        return reject(new Error(`${scriptName} produced no output.`));
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (err) {
        return reject(
          new Error(`${scriptName} output is not valid JSON: ${err.message}. Raw: ${stdout.slice(0, 200)}`)
        );
      }

      resolve(parsed);
    });

    child.on('error', (err) => {
      // This fires when the binary itself cannot be found (wrong PYTHON_BIN).
      reject(new Error(`Failed to spawn ${pythonBin}: ${err.message}`));
    });
  });
}

module.exports = { runPython };
