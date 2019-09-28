const assert = require('chai').assert;
const Web3 = require('web3')
const ganache = require('ganache-core')
const t = require('../util/twrap.js');
const types = require('../util/types.js');
types.loadTestTypes();

const pkg = require('../pkg.js')
pkg.types.loadTestTypes()

const web3 = new Web3(ganache.provider({
  gasLimit: 0xffffffff,
  allowUnlimitedContractSize: true,
  debug: true
}))

const toWei = web3.utils.toWei
const fromWei = web3.utils.fromWei

const slightly = require('../util/slightly.js');
const MAX = web3.utils.toTwosComplement(-1);

describe('fast', async () => {
    let accts;
    let stub;
    let pool;
    let factory;
    let DAI;
    let ETH;

    before(async () => {
        let accts = await web3.eth.getAccounts();
        web3.opts = {
          from: accts[0],
          gas: 7000000
        }
        const BStub = new t.TType(web3, types, 'BStub')
        const BPool = new t.TType(web3, types, 'BPool')
        const BFactory = new t.TType(web3, types, 'BFactory')
        const TToken = new t.TType(web3, types, 'TToken')

        factory = await BFactory.deploy();

        pool = await factory.newBPool();

        DAI = await TToken.deploy();
        MKR = await TToken.deploy();
        console.log('deployed pool and tokens')

        await DAI.mint(toWei('1000000000')) // 1 billion
        await MKR.mint(toWei('1000000'))  // 1 million
        console.log('minted tokens')

        for (const user of [accts[0], accts[1]]) {
          for (const coin of [DAI, MKR, pool]) {
            web3.opts.from = user
            await coin.approve(pool.__address, MAX)
          }
        }
        web3.opts.from = accts[0]
        console.log('set up approvals')

        await pool.bind(DAI.__address);
        await pool.bind(MKR.__address);
        console.log('tokens bound');
    });

    beforeEach(async () => {
        await pool.setParams(DAI.__address, toWei('1000000'), toWei('2.5')) // 1 million balance
        await pool.setParams(MKR.__address, toWei('1000'), toWei('3.5')) // 1 thousand balance
        console.log('reset params')
        await pool.start();
        console.log('started');
    });

    it('correct setup', async () => {
        let res = await pool.getBalance(DAI.__address);
        assert.equal(res, toWei('1000000'))
    });
});