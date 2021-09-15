async function main() {
  const beneficiaryAddress = "0xF9A20859fd38bb5548952ea4DA8249Cc6cC2f7f0";

  const Token = await ethers.getContractFactory("ForceCowBoy");
  const token = await Token.deploy(beneficiaryAddress);
  await token.deployed();
  console.log(token.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
