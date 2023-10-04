import { Fr } from '@aztec/foundation/fields'
import {
  createAztecRpcClient,
  AztecRPC,
  CompleteAddress,
  getSchnorrAccount,
  GrumpkinScalar
} from '@aztec/aztec.js'
import { PrivateCounterContract } from '../contracts/types/PrivateCounter.js'
import { envGet, hexToBuffer } from '../utils.js'

const { SANDBOX_URL = 'http://localhost:8080' } = process.env
const PRIV_KEY = hexToBuffer(envGet('PRIV_KEY'))

describe('PrivateCounter', () => {
  const initialOwnerCount = 100n
  let rpc: AztecRPC
  let salt: Fr
  let accounts: CompleteAddress[]
  let counter: PrivateCounterContract

  beforeAll(async () => {
    rpc = createAztecRpcClient(SANDBOX_URL)

    accounts = await rpc.getRegisteredAccounts()

    const deployerWallet = accounts[0]
    salt = Fr.random()

    counter = await PrivateCounterContract.deploy(
      rpc,
      initialOwnerCount,
      deployerWallet.address
    )
      .send({ contractAddressSalt: salt })
      .deployed()
  })

  it('users starts with correct counter', async () => {
    const [owner, other] = accounts

    expect(
      await counter.methods.get_counter(owner.address.toField()).view()
    ).toEqual(initialOwnerCount)

    expect(
      await counter.methods.get_counter(other.address.toField()).view()
    ).toEqual(0n)
  })

  it('can increase counter', async () => {
    const [owner] = accounts

    expect(
      await counter.methods.get_counter(owner.address.toField()).view()
    ).toEqual(initialOwnerCount)

    const mainGrumpScalar = GrumpkinScalar.fromBuffer(PRIV_KEY)
    const ownerWallet = await getSchnorrAccount(
      rpc,
      mainGrumpScalar,
      mainGrumpScalar,
      owner
    ).getWallet()

    expect(owner.address.toString()).toEqual(
      ownerWallet.getAddress().toString()
    )

    await counter
      .withWallet(ownerWallet)
      .methods.increment(owner.address.toField())
      .send()
      .wait()

    expect(
      await counter.methods.get_counter(owner.address.toField()).view()
    ).toEqual(initialOwnerCount + 1n)
  })
})
