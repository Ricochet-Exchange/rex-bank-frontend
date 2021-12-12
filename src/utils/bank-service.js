import BankAbi from "../contracts/Bank.json";
import Erc20Abi from "../contracts/Erc20.json";
import TokenService from "./token-service";

export default class BankService {
  contractAddr;
  web3Service;
  bankAbi;
  erc20Abi;
  contract;
  token;

  constructor(contractAddr, web3Service, connectedAccount) {
    this.contractAddr = contractAddr;
    this.web3Service = web3Service;
    this.bankAbi = BankAbi.abi;
    this.erc20Abi = Erc20Abi;
    this.connectedAccount = connectedAccount;
  }

  async initContract() {
    this.contract = await this.web3Service.initContract(
      this.bankAbi,
      this.contractAddr
    );
    console.log("ABI", this.erc20Abi);
    this.token = await this.web3Service.initContract(
      this.erc20Abi,
      (await this.contract.methods.getDebtTokenAddress().call())
    )
    return this.contract;
  }

  async getBankState() {
    if (!this.contract) {
      await this.initContract();
    }

    const vault = await this.getVaultData();

    const debtTokenAddress = await this.contract.methods
      .getDebtTokenAddress()
      .call();
    const collateralTokenAddress = await this.contract.methods
      .getCollateralTokenAddress()
      .call();
    const debtToken = await this.getTokenData(debtTokenAddress);
    const collateralToken = await this.getTokenData(collateralTokenAddress);

    let name = await this.contract.methods.getName().call();
    let reserveBalance = await this.token.methods.balanceOf(this.contractAddr).call()
    if (this.contractAddr === "0x91093c77720e744F415D33551C2fC3FAf7333c8c") {
      name = "🚫 REX Bank";
      reserveBalance = "0";
    }


    return {
      vault,
      debtToken: {
        ...debtToken,
        price: await this.contract.methods.getDebtTokenPrice().call(),
        granularityPrice: await this.contract.methods
          .getDebtTokenPriceGranularity()
          .call(),
      },
      collateralToken: {
        ...collateralToken,
        price: await this.contract.methods.getCollateralTokenPrice().call(),
        granularityPrice: await this.contract.methods
          .getCollateralTokenPriceGranularity()
          .call(),
      },
      interestRate: await this.contract.methods.getInterestRate().call(),
      originationFee: await this.contract.methods.getOriginationFee().call(),
      collateralizationRatio: await this.contract.methods
        .getCollateralizationRatio()
        .call(),
      liquidationPenalty: await this.contract.methods
        .getLiquidationPenalty()
        .call(),
      reserveBalance: reserveBalance,
      reserveCollateralBalance: await this.contract.methods
        .getReserveCollateralBalance()
        .call(),
      name: name,
    };
  }

  async getTokenData(tokenAddress) {
    const tokenService = new TokenService(tokenAddress, this.web3Service);

    let unlocked = 0;
    if (this.connectedAccount) {
      unlocked = await tokenService.allowance(
        this.connectedAccount,
        this.contractAddr
      );
    }

    return {
      address: tokenAddress,
      symbol: await tokenService.getSymbol(),
      decimals: await tokenService.getDecimals(),
      unlockedAmount: unlocked,
    };
  }

  async getVaultData() {
    const collateralAmount = await this.contract.methods
      .getVaultCollateralAmount()
      .call({ from: this.connectedAccount });
    const repayAmount = await this.contract.methods
      .getVaultRepayAmount()
      .call({ from: this.connectedAccount });
    let debtAmount = await this.contract.methods
      .getVaultDebtAmount()
      .call({ from: this.connectedAccount });

    // Accounts for interest
    // if (+repayAmount > +debtAmount) {
    //   debtAmount = repayAmount;
    // } else {
    //   debtAmount += repayAmount;
    // }

    let collateralizationRatio = 0;
    if (this.connectedAccount) {
      collateralizationRatio = await this.contract.methods
        .getVaultCollateralizationRatio(this.connectedAccount)
        .call();
    }

    let hasVault = +debtAmount > 0 || +collateralAmount > 0;
    if (this.contractAddr !== "0xaD39F774A75C7673eE0c8Ca2A7b88454580D7F53") {
      hasVault = true;
    }

    return {
      collateralAmount,
      repayAmount,
      debtAmount,
      collateralizationRatio,
      hasVault: hasVault,
    };
  }

  async deposit(depositAmount, setTx) {
    if (!this.contract) {
      await this.initContract();
    }

    const amount = (+depositAmount * 1e18).toLocaleString('fullwide', {useGrouping:false});

    let deposit = this.contract.methods
      .vaultDeposit(amount)
      .send({ from: this.connectedAccount })
      .once("transactionHash", (txHash) => {
        setTx(txHash);
      })
      .then((resp) => {
        return resp;
      })
      .catch((err) => {
        console.log(err);
        return { error: "rejected transaction" };
      });
    return deposit;
  }

  async borrow(borrowAmount, setTx) {
    if (!this.contract) {
      await this.initContract();
    }

    const amount = (+borrowAmount * 1e18).toLocaleString('fullwide', {useGrouping:false})

    let deposit = this.contract.methods
      .vaultBorrow(amount)
      .send({ from: this.connectedAccount })
      .once("transactionHash", (txHash) => {
        setTx(txHash);
      })
      .then((resp) => {
        return resp;
      })
      .catch((err) => {
        console.log(err);
        return { error: "rejected transaction" };
      });
    return deposit;
  }

  async withdraw(withdrawAmount, setTx) {
    if (!this.contract) {
      await this.initContract();
    }

    const amount = (+withdrawAmount * 1e18).toLocaleString('fullwide', {useGrouping:false})

    let deposit = this.contract.methods
      .vaultWithdraw(amount)
      .send({ from: this.connectedAccount })
      .once("transactionHash", (txHash) => {
        setTx(txHash);
      })
      .then((resp) => {
        return resp;
      })
      .catch((err) => {
        console.log(err);
        return { error: "rejected transaction" };
      });
    return deposit;
  }

  async repay(repayAmount, setTx) {
    if (!this.contract) {
      await this.initContract();
    }

    const amount = (+repayAmount * 1e18).toLocaleString('fullwide', {useGrouping:false})

    let deposit = this.contract.methods
      .vaultRepay(amount)
      .send({ from: this.connectedAccount })
      .once("transactionHash", (txHash) => {
        setTx(txHash);
      })
      .then((resp) => {
        return resp;
      })
      .catch((err) => {
        console.log(err);
        return { error: "rejected transaction" };
      });
    return deposit;
  }
}
