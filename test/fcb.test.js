const { expect } = require('chai');

describe('FCB', function () {
  const beneficiaryAddress = "0xF9A20859fd38bb5548952ea4DA8249Cc6cC2f7f0";
  const FEE = 4
  const DECIMAL = '18'
  before(async function () {
    this.accounts = await ethers.getSigners();
    //const Factory = await ethers.getContractFactory("PancakeFactory");
    //const WBNB = await ethers.getContractFactory("WBNB");
    //const BUSD = await ethers.getContractFactory("BUSD");

    //const factory = await Factory.deploy("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
    //const wbnb = await WBNB.deploy();
    //const busd = await BUSD.deploy();

    //await factory.deployed();
    //await wbnb.deployed();
    //await busd.deployed();

    //const Router = await ethers.getContractFactory("PancakeRouter");
    //this.router = await Router.deploy(factory.address, wbnb.address);
    //await this.router.deployed();

    this.owner = this.accounts[0]
  });

  beforeEach(async function () {
    const Token = await ethers.getContractFactory("ForceCowBoy");
    this.token = await Token.deploy(beneficiaryAddress);
    await this.token.deployed();
  });

  //it('buy sell', async function () {
  //  const bnb = this.router.WETH()
  //  const bnbAmount = ethers.utils.parseEther('100')
  //  const tokenAmount = (await this.token.totalSupply()).mul(20).div(100)
  //  await this.token.approve(this.router.address, tokenAmount)
  //  await this.router.addLiquidityETH( this.token.address, tokenAmount, 0, 0, this.owner.address, Date.now(),{ value: bnbAmount })

  //  const buyer = this.accounts[1]
  //  const buyAmount = ethers.utils.parseUnits('1', DECIMAL);
  //  await this.router.connect(buyer).swapExactETHForTokens(
  //    0,
  //    [bnb, this.token.address],
  //    buyer.address,
  //    Date.now(),
  //    {value: buyAmount}
  //  )
  //  const gotToken = await this.token.balanceOf(buyer.address)
////sell
  //  await this.token.connect(buyer).approve(this.router.address, gotToken)
  //  await this.router.connect(buyer).swapExactTokensForETHSupportingFeeOnTransferTokens(
  //    gotToken,
  //    0,
  //    [this.token.address, bnb],
  //    buyer.address,
  //    Date.now(),
  //  )
  //});
  it("transfer should deduct fee", async function () {
    const owner = this.accounts[0];
    const sender = this.accounts[1];
    const recipient = this.accounts[2];
    const amount = ethers.utils.parseUnits('1000', DECIMAL);
    const dAmount = amount.mul(FEE).div(100);
    const actual = amount.sub(dAmount);

    await this.token.transfer(sender.address, amount);

    await expect(this.token.connect(sender).transfer(recipient.address, amount))
      .to.emit(this.token, 'Transfer')
      .withArgs(sender.address, recipient.address, actual)
  });
  it("transfer from excluded account take no fees", async function () {
    owner = this.accounts[0];
    sender = this.accounts[1];
    recipient = this.accounts[2];

    const amount = ethers.utils.parseUnits('1', DECIMAL);
    await this.token.transfer(sender.address, amount);
    await this.token.exclude(sender.address, true);
    await this.token.connect(sender).transfer(recipient.address, amount)
    const recipientBalance = await this.token.balanceOf(recipient.address);
    expect(recipientBalance).to.be.eq(amount);
  });
  it("transfer to excluded account take no fees", async function () {
    owner = this.accounts[0];
    sender = this.accounts[1];
    recipient = this.accounts[2];
    const amount = ethers.utils.parseUnits('1', DECIMAL);
    await this.token.transfer(sender.address, amount);
    await this.token.exclude(recipient.address, true);
    await this.token.connect(sender).transfer(recipient.address, amount)
    const recipientBalance = await this.token.balanceOf(recipient.address);
    expect(recipientBalance).to.be.eq(amount);
  });
  it("transfer from blacklist and whitelist", async function () {
    sender = this.accounts[1];
    recipient = this.accounts[2];
    const amount = ethers.utils.parseUnits('1', DECIMAL);
    const dAmount = amount.mul(FEE).div(100);
    const actual = amount.sub(dAmount);

    await this.token.transfer(sender.address, amount);
    await this.token.blacklist([sender.address], true);

    await expect(this.token.connect(sender).transfer(recipient.address, amount))
      .to.be.revertedWith('FCB: transfer from blacklisted address')

    await this.token.blacklist([sender.address], false);
    await expect(this.token.connect(sender).transfer(recipient.address, amount))
      .to.emit(this.token, 'Transfer')
      .withArgs(sender.address, recipient.address, actual)
  });
  it("pause", async function () {
    const amount = ethers.utils.parseUnits('1', DECIMAL);
    const sender = this.accounts[0]
    const recipient = this.accounts[1]
    await this.token.pause();
    await expect(this.token.transfer(recipient.address, amount)).
      to.be.revertedWith('Pausable: paused')
    await this.token.unpause();
    await expect(this.token.transfer(recipient.address, amount))
      .to.emit(this.token, 'Transfer')
      .withArgs(sender.address, recipient.address, amount)
  });
  it("get metadata", async function () {
    await this.token.name();
    await this.token.symbol();
    await this.token.decimals();
    await this.token.totalSupply();
  });
  it("burn", async function () {
    const amount = ethers.utils.parseUnits('1', DECIMAL);
    const caller = this.accounts[0]

    const totalSupply0 = await this.token.totalSupply()
    const balance0 = await this.token.balanceOf(caller.address)

    await this.token.connect(caller).burn(amount);

    const totalSupply1 = await this.token.totalSupply()
    const balance1 = await this.token.balanceOf(caller.address)

    expect(balance1).to.eq(balance0.sub(amount))
    expect(totalSupply1).to.eq(totalSupply0.sub(amount))
  });
  it("bulk blacklist and whitelist", async function () {
    const senders = [
      this.accounts[1],
      this.accounts[2],
      this.accounts[3],
    ]
    const recipient = this.accounts[5];
    const addresses = senders.reduce( (acc, sender) => {
      acc.push(sender.address)
      return acc
    }, [])
    await this.token.blacklist(addresses, true);
    const amount = ethers.utils.parseEther('1');

    senders.map( async sender => {
      await expect(this.token.connect(sender).transfer(recipient.address, amount))
        .to.be.revertedWith('FCB: transfer from blacklisted address')
    })
  });
});
