import {
  createAztecRpcClient,
  getSchnorrAccount,
  GrumpkinScalar,
  Wallet,
  AztecRPC,
  AztecAddress,
  Fr
} from '@aztec/aztec.js'
import { envGet, hexToBuffer, toAddr } from './utils.js'
import { PrivateCounterContract } from './contracts/types/PrivateCounter.js'

const SANDBOX_URL = process.env['SANDBOX_URL'] || 'http://localhost:8080'
const PRIV_KEY = hexToBuffer(envGet('PRIV_KEY_1'))

const MAIN_ADDR = toAddr(envGet('MAIN_ADDR'))
const COUNTER_ADDR = toAddr(envGet('COUNTER_ADDR'))

async function getCounter(client: Wallet) {
  return await PrivateCounterContract.at(COUNTER_ADDR, client)
}

async function deployCounter(
  rpc: AztecRPC,
  addr: AztecAddress,
  salt: Fr
): Promise<PrivateCounterContract> {
  const res = await PrivateCounterContract.deploy(rpc, 100, addr)
    .send({
      contractAddressSalt: salt
    })
    .wait()
  return res.contract
}

async function main() {
  console.log('private key:', PRIV_KEY.toString('hex'))
  const rpc = createAztecRpcClient(SANDBOX_URL)
  const { chainId } = await rpc.getNodeInfo()
  console.log(`Connected to chain ${chainId}`)

  const firstComplete = await rpc.getRegisteredAccount(MAIN_ADDR)

  const mainGrumpScalar = GrumpkinScalar.fromBuffer(PRIV_KEY)
  const account = await getSchnorrAccount(
    rpc,
    mainGrumpScalar,
    mainGrumpScalar,
    firstComplete
  ).getWallet()
  console.log('account.address:', account.getAddress().toString())

  // const counter = await deployCounter(rpc, account.getAddress(), Fr.random())
  const counter = await getCounter(account)

  const getCount = async (c: PrivateCounterContract, f: string) => {
    console.log('f:', f)
    console.log('counter.methods:', c.methods)
    const count = await c.methods
      .get_counter(account.getAddress().toField())
      .view()
    console.log('count:', count)
  }

  await getCount(counter, 'flag')

  console.log('pre tx')
  console.log('account.getAddress():', account.getAddress())
  console.log(
    'account.getAddress().toString():',
    account.getAddress().toString()
  )
  console.log('account.getAddress().toField():', account.getAddress().toField())
  await counter
    .withWallet(account)
    .methods.increment(account.getAddress().toField())
    .send()
    .wait()
  // console.log(`Sent transfer transaction ${await tx.getTxHash()}`)

  // console.log('Awaiting transaction to be mined')
  // const receipt = await tx.wait()
  // console.log(`Transaction has been mined on block ${receipt.blockNumber}`)

  await getCount(counter, 'lol')
}

main().then(() => process.exit(0))
