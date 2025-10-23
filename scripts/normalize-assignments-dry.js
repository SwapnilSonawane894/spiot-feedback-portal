#!/usr/bin/env node
// Convenience wrapper to run normalize-assignments.js in dry-run mode
const { spawn } = require('child_process');
const args = process.argv.slice(2).concat(['--dry-run']);
const p = spawn('node', ['scripts/normalize-assignments.js', ...args], { stdio: 'inherit' });
p.on('exit', code => process.exit(code));
