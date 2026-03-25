import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, '../public/og-image.svg')
const pngPath = resolve(__dirname, '../public/og-image.png')

const svg = readFileSync(svgPath)

await sharp(svg)
  .png()
  .toFile(pngPath)

console.log('Generated: public/og-image.png')
