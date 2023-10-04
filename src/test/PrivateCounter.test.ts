import { Fr } from '@aztec/foundation/fields'
import {
  createAztecRpcClient,
  AztecRPC,
  CompleteAddress,
  getSchnorrAccount,
  GrumpkinScalar,
  AccountWallet
} from '@aztec/aztec.js'
import { PrivateCounterContract } from '../contracts/types/PrivateCounter.js'
import { envGet, hexToBuffer } from '../utils.js'

const { SANDBOX_URL = 'http://localhost:8080' } = process.env
const PRIV_KEYS = [1, 2, 3].map((i) => hexToBuffer(envGet(`PRIV_KEY_${i}`)))

describe('PrivateCounter', () => {
  const initialOwnerCount = 100n
  let rpc: AztecRPC
  let salt: Fr
  let wallets: AccountWallet[]
  let counter: PrivateCounterContract

  beforeAll(async () => {
    rpc = createAztecRpcClient(SANDBOX_URL)

    const completeAddrs = await rpc.getRegisteredAccounts()

    wallets = await Promise.all(
      completeAddrs.map(async (completeAddr: CompleteAddress, i: number) => {
        const skGrumpScalar = GrumpkinScalar.fromBuffer(PRIV_KEYS[i])
        return await getSchnorrAccount(
          rpc,
          skGrumpScalar,
          skGrumpScalar,
          completeAddr
        ).getWallet()
      })
    )

    const deployerWallet = wallets[0]
    salt = Fr.random()

    counter = await PrivateCounterContract.deploy(
      rpc,
      initialOwnerCount,
      deployerWallet.getAddress().toField()
    )
      .send({ contractAddressSalt: salt })
      .deployed()
  })

  it('users starts with correct counter', async () => {
    const [owner, other] = wallets

    expect(
      await counter.methods.get_counter(owner.getAddress().toField()).view()
    ).toEqual(initialOwnerCount)

    expect(
      await counter.methods.get_counter(other.getAddress().toField()).view()
    ).toEqual(0n)
  })

  it('can increase counter', async () => {
    const [owner] = wallets

    expect(
      await counter.methods.get_counter(owner.getAddress().toField()).view()
    ).toEqual(initialOwnerCount)

    await counter
      .withWallet(owner)
      .methods.increment(owner.getAddress().toField())
      .send()
      .wait()

    expect(
      await counter.methods.get_counter(owner.getAddress().toField()).view()
    ).toEqual(initialOwnerCount + 1n)
  })
})
