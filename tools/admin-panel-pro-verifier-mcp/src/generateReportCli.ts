#!/usr/bin/env node
import { buildVerificationReport } from './verifyEngine.js'
import { writeVerificationReport } from './utils/reportWriter.js'
import { getProjectRoot } from './utils/projectScanner.js'

const root = getProjectRoot()
const report = await buildVerificationReport(root, process.argv.includes('--with-build'))
const out = writeVerificationReport(root, report)
console.log(`Informe generado: ${out}`)
console.log(`Recomendación: ${report.recommendation}`)
