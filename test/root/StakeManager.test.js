import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import chaiBigNumber from 'chai-bignumber'

import { generateFirstWallets, mnemonics } from '../helpers/wallets'
import { linkLibs } from '../helpers/utils'
import { assertRevert } from '../helpers/assert-revert'
import { StakeManagerMock, RootToken } from '../helpers/contracts'
import LogDecoder from '../helpers/log-decoder'

// add chai pluggin
chai
  .use(chaiAsPromised)
  .use(chaiBigNumber(web3.BigNumber))
  .should()

contract('StakeManager', async function(accounts) {
  let stakeToken
  let stakeManager
  let wallets
  let logDecoder

  before(async function() {
    // link libs
    await linkLibs()

    // log decoder
    logDecoder = new LogDecoder([
      StakeManagerMock._json.abi,
      RootToken._json.abi
    ])
  })

  // staking
  describe('Stake', async function() {
    before(async function() {
      stakeToken = await RootToken.new('Stake Token', 'STAKE')
      stakeManager = await StakeManagerMock.new(stakeToken.address)
      wallets = generateFirstWallets(mnemonics, 10)

      // transfer tokens to other accounts
      await stakeToken.mint(wallets[0].getAddressString(), web3.toWei(200))
      await stakeToken.mint(wallets[1].getAddressString(), web3.toWei(400))
      await stakeToken.mint(wallets[2].getAddressString(), web3.toWei(505))
      await stakeToken.mint(wallets[3].getAddressString(), web3.toWei(750))
      await stakeToken.mint(wallets[4].getAddressString(), web3.toWei(800))
      await stakeToken.mint(wallets[5].getAddressString(), web3.toWei(400))
      await stakeToken.mint(wallets[6].getAddressString(), web3.toWei(500))
      await stakeToken.mint(wallets[7].getAddressString(), web3.toWei(700))
      await stakeToken.mint(wallets[8].getAddressString(), web3.toWei(700))
      await stakeToken.mint(wallets[9].getAddressString(), web3.toWei(600))
    })

    it('should set the validator threshold to 5', async function() {
      const thresholdReceipt = await stakeManager.updateValidatorThreshold(5)
      const logs = logDecoder.decodeLogs(thresholdReceipt.receipt.logs)
      logs.should.have.lengthOf(1)
      logs[0].event.should.equal('ThresholdChange')
      logs[0].args.newThreshold.should.be.bignumber.equal(5)

      const newThreshold = await stakeManager.validatorThreshold()
      newThreshold.should.be.bignumber.equal(5)
    })

    it('should set token address and owner properly', async function() {
      await stakeManager.token().should.eventually.equal(stakeToken.address)
      await stakeManager.owner().should.eventually.equal(accounts[0])
    })

    it('should stake via wallets[1]', async function() {
      const user = wallets[1].getAddressString()
      const amount = web3.toWei(1)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      const stakeReceipt = await stakeManager.stake(amount, '0x0', {
        from: user
      })

      // decode logs
      const logs = logDecoder.decodeLogs(stakeReceipt.receipt.logs)
      logs.should.have.lengthOf(2)

      logs[0].event.should.equal('Transfer')
      logs[0].args.from.toLowerCase().should.equal(user)
      logs[0].args.to.toLowerCase().should.equal(stakeManager.address)
      logs[0].args.value.should.be.bignumber.equal(amount)

      logs[1].event.should.equal('StakeInit')
      logs[1].args.user.toLowerCase().should.equal(user)
      logs[1].args.amount.should.be.bignumber.equal(amount)

      // check amount
      // const totalStake = await stakeManager.totalStaked()
      // totalStake.should.be.bignumber.equal(amount)

      // staked for
      // const stakedFor = await stakeManager.totalStakedFor(user)
      // stakedFor.should.be.bignumber.equal(amount)
    })

    it('should stake via wallets[2]', async function() {
      const user = wallets[2].getAddressString()
      const amount = web3.toWei(5)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      const stakeReceipt = await stakeManager.stake(amount, '0x0', {
        from: user
      })

      // decode logs
      const logs = logDecoder.decodeLogs(stakeReceipt.receipt.logs)
      logs.should.have.lengthOf(2)

      logs[0].event.should.equal('Transfer')
      logs[0].args.from.toLowerCase().should.equal(user)
      logs[0].args.to.toLowerCase().should.equal(stakeManager.address)
      logs[0].args.value.should.be.bignumber.equal(amount)

      logs[1].event.should.equal('StakeInit')
      logs[1].args.user.toLowerCase().should.equal(user)
      logs[1].args.amount.should.be.bignumber.equal(amount)
      // check amount
      // const totalStake = await stakeManager.totalStaked()
      // totalStake.should.be.bignumber.equal(web3.toWei(6))

      // staked for
      const stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(amount)
    })

    it('should stake via wallets[3]', async function() {
      const user = wallets[3].getAddressString()
      const amount = web3.toWei(20)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      await stakeManager.stake(amount, '0x0', { from: user })

      // staked for
      const stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(amount)
    })

    it('Duplicate: should stake via wallets[3] fail', async function() {
      const user = wallets[3].getAddressString()
      const amount = web3.toWei(20)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      try {
        await stakeManager.stake(amount, '0x0', { from: user })
      } catch (error) {
        const invalidOpcode = error.message.search('revert') >= 0
        assert(invalidOpcode, "Expected revert, got '" + error + "' instead")
        return
      }

      // staked for
      const stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(amount)
    })

    it('should stake via wallets[4-6]', async function() {
      let user = wallets[4].getAddressString()
      let amount = web3.toWei(20)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      await stakeManager.stake(amount, '0x0', { from: user })

      // staked for
      let stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(amount)

      user = wallets[5].getAddressString()
      amount = web3.toWei(20)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      await stakeManager.stake(amount, '0x0', { from: user })

      // staked for
      stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(amount)

      user = wallets[6].getAddressString()
      amount = web3.toWei(20)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      await stakeManager.stake(amount, '0x0', { from: user })

      // staked for
      stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(amount)
    })

    it('should try to stake after validator threshold', async function() {
      const user = wallets[7].getAddressString()
      const amount = web3.toWei(100)

      // approve tranfer

      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      try {
        await stakeManager.stake(amount, '0x0', { from: user })
      } catch (error) {
        const invalidOpcode = error.message.search('revert') >= 0
        assert(invalidOpcode, "Expected revert, got '" + error + "' instead")
        return
      }
      // staked for
      const stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(0)
    })

    it('should dethrone via wallets[1] and become currentValidator', async function() {
      const user = wallets[1].getAddressString()
      const amount = web3.toWei(1)
      const addressZero = '0x0000000000000000000000000000000000000000'
      // stake now
      await stakeManager.dethrone(addressZero, { from: user })

      // claim stake
      await stakeManager.stakeClaim({ from: user })

      // check amount
      const totalStake = await stakeManager.totalStaked()
      totalStake.should.be.bignumber.equal(amount)
      // staked for
      const stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(amount)
      let validators = await stakeManager.getCurrentValidatorSet()
      expect(validators).to.eql([user])
      validators = await stakeManager.getNextValidatorSet()
      expect(validators).to.not.have.members([user])
      const validatorDetails = await stakeManager.getDetails(user)
    })

    it('should dethrone via wallets[2] and become currentValidator', async function() {
      const user = wallets[2].getAddressString()
      const UserAmount = web3.toWei(5)
      const amount = web3.toWei(6)
      const addressZero = '0x0000000000000000000000000000000000000000'
      // stake now
      await stakeManager.dethrone(addressZero, { from: user })

      // claim stake
      await stakeManager.stakeClaim({ from: user })

      // check amount
      const totalStake = await stakeManager.totalStaked()
      totalStake.should.be.bignumber.equal(amount)
      // staked for
      const stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(UserAmount)
      let users = [user, wallets[1].getAddressString()]
      let validators = await stakeManager.getCurrentValidatorSet()
      expect(validators).to.include.members(users)
      validators = await stakeManager.getNextValidatorSet()
      expect(validators).to.not.include.members(users)
    })

    it('should try to dethrone currentValidator while there is empty slot', async function() {
      const user = wallets[3].getAddressString()
      const UserAmount = web3.toWei(20)
      const amount = web3.toWei(26)
      const validator = wallets[3].getAddressString()
      // stake now
      await stakeManager.dethrone(validator, { from: user })

      // claim stake
      await stakeManager.stakeClaim({ from: user })

      // check amount
      const totalStake = await stakeManager.totalStaked()
      totalStake.should.be.bignumber.equal(amount)
      // staked for
      const stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(UserAmount)
      let validators = await stakeManager.getCurrentValidatorSet()
      expect(validators).to.include.members([validator])
      validators = await stakeManager.getNextValidatorSet()
      expect(validators).to.not.include.members([validator])
    })

    it('should dethrone address(0) from wallet[4-5]', async function() {
      let user = wallets[4].getAddressString()
      let UserAmount = web3.toWei(20)
      let amount = web3.toWei(66)
      const addressZero = '0x0000000000000000000000000000000000000000'
      let users = [user]
      // stake now
      await stakeManager.dethrone(addressZero, { from: user })
      // claim stake
      await stakeManager.stakeClaim({ from: user })
      // staked for
      let stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(UserAmount)
      user = wallets[5].getAddressString()
      users.push(user)
      // stake now
      await stakeManager.dethrone(addressZero, { from: user })
      // claim stake
      await stakeManager.stakeClaim({ from: user })
      // staked for
      stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(UserAmount)

      stakedFor = await stakeManager.totalStakedFor(user)
      stakedFor.should.be.bignumber.equal(UserAmount)
      // check amount
      const totalStake = await stakeManager.totalStaked()
      totalStake.should.be.bignumber.equal(amount)

      let validators = await stakeManager.getCurrentValidatorSet()
      expect(validators).to.include.members(users)
      validators = await stakeManager.getNextValidatorSet()
      expect(validators).to.not.include.members(users)
    })

    it('should dethrone address via wallets[7] and fail', async function() {
      const user = wallets[7].getAddressString()
      const amount = web3.toWei(1)
      const addressZero = '0x0000000000000000000000000000000000000000'

      // stake now
      try {
        await stakeManager.dethrone(addressZero, { from: user })
      } catch (error) {
        const invalidOpcode = error.message.search('revert') >= 0
        assert(invalidOpcode, "Expected revert, got '" + error + "' instead")
        return
      }
      let validators = await stakeManager.getCurrentValidatorSet()
      expect(validators).to.not.include.members([user])
      validators = await stakeManager.getNextValidatorSet()
      expect(validators).to.not.include.members([user])
    })

    it('should stake via wallets[7]', async function() {
      const user = wallets[7].getAddressString()
      const amount = web3.toWei(20)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      await stakeManager.stake(amount, '0x0', { from: user })

      let size = await stakeManager.validatorSetSize()
      size.should.be.bignumber.equal(5)

      size = await stakeManager.nextValidatorSetSize()
      size.should.be.bignumber.equal(2)
    })

    it('should stake via wallets[8]', async function() {
      const user = wallets[8].getAddressString()
      const amount = web3.toWei(20)

      // approve tranfer
      await stakeToken.approve(stakeManager.address, amount, {
        from: user
      })

      // stake now
      await stakeManager.stake(amount, '0x0', { from: user })
      let size = await stakeManager.validatorSetSize()
      size.should.be.bignumber.equal(5)

      size = await stakeManager.nextValidatorSetSize()
      size.should.be.bignumber.equal(3)
    })

    it('should dethrone address via wallets[8] -> wallet[1]', async function() {
      const user = wallets[8].getAddressString()
      const validator = wallets[1].getAddressString()

      // stake now
      await stakeManager.dethrone(validator, { from: user })
      let validators = await stakeManager.getNextValidatorSet()
      expect(validators).to.not.include.members([user])
      const userDetails = await stakeManager.getDetails(user)
      const validatorDetails = await stakeManager.getDetails(validator)
      // exit of validator and entry of new validator should be same
      userDetails[0].should.be.bignumber.equal(validatorDetails[1])
      // validator should be unstaking
      validatorDetails[2].should.be.bignumber.equal(2)
    })
    it('should unstake and select descendent', async function() {})

    it('should unstake and claim unstaked amount verify', async function() {})
    it('should unstake all validators and wait for d*2 and varify new validators', async function() {})

    // getDetails
  })
})
