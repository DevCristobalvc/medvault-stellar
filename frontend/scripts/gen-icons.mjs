import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(resolve(__dir, '../public/medvault-icon.svg'), 'utf8')

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(resolve(__dir, `../public/icon-${size}.png`), png)
  console.log(`icon-${size}.png generated (${png.length} bytes)`)
}
