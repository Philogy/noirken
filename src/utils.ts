import { AztecAddress } from '@aztec/aztec.js'
import dotenv from 'dotenv'

const hexToBuffer = (hex: string): Buffer => Buffer.from(hex.slice(2), 'hex')
const toAddr = (addr: string): AztecAddress =>
  new AztecAddress(hexToBuffer(addr))

const envGet = (key: string): string => {
  dotenv.config()
  const value = process.env[key]
  if (value === undefined) throw new Error(`Missing env key "${key}"`)
  return value
}

export { hexToBuffer, toAddr, envGet }
