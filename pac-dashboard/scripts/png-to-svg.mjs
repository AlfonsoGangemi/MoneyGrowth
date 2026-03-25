import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pngPath = resolve(__dirname, '../public/og-image.png')
const svgPath = resolve(__dirname, '../public/og-image.svg')

const pngBuffer = readFileSync(pngPath)
const { width, height } = await sharp(pngBuffer).metadata()
const base64 = pngBuffer.toString('base64')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64}" />
</svg>`

writeFileSync(svgPath, svg)
console.log(`Generated: public/og-image.svg (${width}x${height})`)
