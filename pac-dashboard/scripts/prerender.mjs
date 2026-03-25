import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const template = await fs.readFile(path.join(root, 'dist/index.html'), 'utf-8')
const { render } = await import(pathToFileURL(path.join(root, 'dist-server/entry-server.js')).href)

const routes = ['/', '/privacy', '/termini']

for (const url of routes) {
  const appHtml = render(url)
  const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

  if (url === '/') {
    await fs.writeFile(path.join(root, 'dist/index.html'), html)
  } else {
    const dir = path.join(root, 'dist', url)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'index.html'), html)
  }

  console.log(`Prerendered: ${url}`)
}

console.log('Prerendering done.')
