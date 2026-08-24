import { spawn } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const children = [
  spawn(npm, ['run', 'dev', '--workspace=backend'], {
    stdio: 'inherit',
    shell: true
  }),
  spawn(npm, ['run', 'dev', '--workspace=frontend'], {
    stdio: 'inherit',
    shell: true
  })
]

let shuttingDown = false

function stopAll(signal = 'SIGTERM') {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    if (code && code !== 0) {
      stopAll()
      process.exitCode = code
      return
    }
    if (signal) stopAll(signal)
  })
}

process.on('SIGINT', () => stopAll('SIGINT'))
process.on('SIGTERM', () => stopAll('SIGTERM'))
