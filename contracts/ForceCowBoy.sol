// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract BPContract{
    function protect(
        address sender, 
        address receiver, 
        uint256 amount
    ) external virtual;
}

contract ForceCowBoy is IERC20, Ownable, Pausable {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    string constant public name = "ForceCowBoy";
    string constant public symbol = "FCB";
    uint8 constant public decimals = 18;
    uint256 private _totalSupply = 100000 * 1E18;

    address public beneficiaryAddress;
    uint8 public feePercentage = 4;

    mapping (address => bool) public isExcluded;
    mapping (address => bool) public isBlacklisted;

    BPContract public BP;
    bool public bpEnabled;

    event TransferFee(address sender, address recipient, uint256 amount);
    event SetFeePercentage(uint8 feePercentage);
    event SetBeneficiaryAddress(address beneficiaryAddress);

    constructor(address beneficiaryAddress_) {
        beneficiaryAddress = beneficiaryAddress_;
        _balances[msg.sender] = _totalSupply;
        isExcluded[msg.sender] = true;
    }

    function burn(uint256 amount) external {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = _allowances[account][msg.sender];
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        _approve(account, _msgSender(), currentAllowance - amount);
        _burn(account, amount);
    }

    function transfer(address recipient, uint256 amount) external override returns (bool)  {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        _approve(sender, _msgSender(), currentAllowance - amount);

        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        _approve(_msgSender(), spender, currentAllowance - subtractedValue);

        return true;
    }

    function setBPAddrss(address _bp) external onlyOwner {
        BP = BPContract(_bp);
    }

    function setBpEnabled(bool _enabled) external onlyOwner {
        bpEnabled = _enabled;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setFeePercentage(uint8 feePercentage_) external onlyOwner {
        require(feePercentage_ <= 10, "FCB: transaction fee percentage exceeds 10");
        feePercentage = feePercentage_;
        emit SetFeePercentage(feePercentage);
    }

    function setBeneficiaryAddress(address beneficiaryAddress_) external onlyOwner {
        beneficiaryAddress = beneficiaryAddress_;
        emit SetBeneficiaryAddress(beneficiaryAddress);
    }

    function exclude(address address_, bool isExcluded_) external onlyOwner {
        isExcluded[address_] = isExcluded_;
    }

    function blacklist(address[] calldata addresses, bool isBlacklist) external onlyOwner {
        for (uint i=0; i<addresses.length; i++) {
            isBlacklisted[addresses[i]] = isBlacklist;
        }
    }

    function totalSupply() external view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) private whenNotPaused {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(!isBlacklisted[sender], "FCB: transfer from blacklisted address");
        require(!isBlacklisted[recipient], "FCB: transfer to blacklisted address");
        require(!isBlacklisted[tx.origin], "FCB: transfer called from blacklisted address");

        if (bpEnabled) {
            BP.protect(sender, recipient, amount);
        }

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        _balances[sender] = senderBalance - amount;

        uint256 receiveAmount = amount;
        if (isExcluded[sender] || isExcluded[recipient]) {
            _balances[recipient] += receiveAmount;
        } else {
            uint256 feeAmount = amount * feePercentage / 100;
            receiveAmount = amount - feeAmount;
            _balances[beneficiaryAddress] += feeAmount;
            _balances[recipient] += receiveAmount;
            emit TransferFee(sender, beneficiaryAddress, feeAmount);
        }

        emit Transfer(sender, recipient, receiveAmount);
    }

    function _burn(address account, uint256 amount) private {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
            _balances[account] = accountBalance - amount;
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _isContract(address account) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}

