import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
const revision = process.env.GITHUB_SHA
if (!/^[a-f0-9]{40}$/.test(revision || '')) throw Error('GITHUB_SHA must identify the deployed source')
const paths = ['index.html', 'quick-start/index.html', 'reference/send/index.html', '_pagefind/pagefind.js']
const files = Object.fromEntries(paths.map(path => [path, createHash('sha256').update(readFileSync(`out/${path}`)).digest('hex')]))
writeFileSync('out/deployment.json', JSON.stringify({ revision, files }, null, 2) + '\n')
