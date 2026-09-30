import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const localPython = path.join(
  projectRoot,
  'python-analysis',
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
const pythonCommand = process.env.PYTHON_BIN
  || (existsSync(localPython)
    ? localPython
    : process.platform === 'win32'
      ? 'python'
      : 'python3');

const result = spawnSync(
  pythonCommand,
  ['-m', 'unittest', 'discover', '-s', 'python-analysis/tests', '-v'],
  { cwd: projectRoot, stdio: 'inherit' },
);

if (result.error) {
  console.error(
    'Pythonテストを開始できませんでした。python-analysis/.venvを作成するか、PYTHON_BINにPythonの実行ファイルを指定してください。',
  );
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
