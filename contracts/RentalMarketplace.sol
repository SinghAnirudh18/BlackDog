// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC4907} from "./IERC4907.sol";

contract RentalMarketplace is ReentrancyGuard, Pausable, Ownable {
    struct Listing {
        address owner;
        address paymentToken; // address(0) native
        uint256 pricePerHour;
        bool requireDeposit;
        uint16 depositBps; // default 5000
        uint16 depositCapBps; // default 20000
        bool active;
    }

    struct HeldDeposit {
        address renter;
        address token; // address(0) native
        uint256 amount;
    }

    struct RentalInfo {
        address renter;
        uint64 startTime;
        uint64 duration; // in hours
        uint256 totalPaid; // total rental payment (excl. deposit)
        address paymentToken; // address(0) native or ERC20
        uint16 feeBpsSnapshot; // snapshot at time of rent
        uint16 upfrontBpsSnapshot; // snapshot at time of rent
    }

    uint16 public platformFeeBps; // 5% = 500
    address public feeRecipient;
    uint64 public minHours = 1;
    uint64 public maxHours = 720;
    uint16 public upfrontBps = 2000; // 20% of net (after fee) paid to owner immediately; rest escrowed

    mapping(bytes32 => Listing) public listings;
    mapping(bytes32 => HeldDeposit) public deposits;
    mapping(bytes32 => RentalInfo) public rentals;

    event Listed(address indexed nft, uint256 indexed tokenId, address indexed owner, address paymentToken, uint256 pricePerHour, bool requireDeposit);
    event Delisted(address indexed nft, uint256 indexed tokenId, address indexed owner);
    event Rented(address indexed nft, uint256 indexed tokenId, address indexed renter, uint64 hoursRented, uint256 totalPaid, address paymentToken, uint256 depositAmount);
    event DepositRefunded(address indexed nft, uint256 indexed tokenId, address indexed renter, address token, uint256 amount);
    event DepositClaimed(address indexed nft, uint256 indexed tokenId, address indexed owner, address token, uint256 amount);
    event FeeParamsUpdated(uint16 feeBps, address feeRecipient);
    event LimitsUpdated(uint64 minHours, uint64 maxHours);
    event EarlyReturn(address indexed nft, uint256 indexed tokenId, address indexed renter, uint256 refund);
    event UpfrontUpdated(uint16 upfrontBps);
    event Settled(address indexed nft, uint256 indexed tokenId, address indexed owner, uint256 ownerPayout);

    constructor(address owner_, uint16 platformFeeBps_, address feeRecipient_) Ownable(owner_) {
        require(feeRecipient_ != address(0), "fee recipient zero");
        require(platformFeeBps_ <= 2000, "fee too high");
        platformFeeBps = platformFeeBps_;
        feeRecipient = feeRecipient_;
    }

    function _key(address nft, uint256 tokenId) internal pure returns (bytes32) { return keccak256(abi.encodePacked(nft, tokenId)); }

    function listForRent(address nft, uint256 tokenId, uint256 pricePerHour, address paymentToken, bool requireDeposit, uint16 depositBps, uint16 depositCapBps) external whenNotPaused {
        require(pricePerHour > 0, "price=0");
        require(IERC721(nft).ownerOf(tokenId) == msg.sender, "not owner");
        require(IERC721(nft).isApprovedForAll(msg.sender, address(this)) || IERC721(nft).getApproved(tokenId) == address(this), "approve marketplace");
        bytes32 k = _key(nft, tokenId);
        listings[k] = Listing({
            owner: msg.sender,
            paymentToken: paymentToken,
            pricePerHour: pricePerHour,
            requireDeposit: requireDeposit,
            depositBps: depositBps == 0 ? 5000 : depositBps,
            depositCapBps: depositCapBps == 0 ? 20000 : depositCapBps,
            active: true
        });
        emit Listed(nft, tokenId, msg.sender, paymentToken, pricePerHour, requireDeposit);
    }

    function delist(address nft, uint256 tokenId) external {
        bytes32 k = _key(nft, tokenId);
        Listing memory l = listings[k];
        require(l.active, "not listed");
        require(l.owner == msg.sender, "not owner");
        require(deposits[k].amount == 0, "active deposit");
        delete listings[k];
        emit Delisted(nft, tokenId, msg.sender);
    }

    function setFeeParams(uint16 feeBps, address recipient) external onlyOwner {
        require(feeBps <= 2000, "fee too high");
        require(recipient != address(0), "zero recipient");
        platformFeeBps = feeBps;
        feeRecipient = recipient;
        emit FeeParamsUpdated(feeBps, recipient);
    }

    function setHourLimits(uint64 minH, uint64 maxH) external onlyOwner {
        require(minH >= 1 && maxH >= minH, "invalid limits");
        minHours = minH;
        maxHours = maxH;
        emit LimitsUpdated(minH, maxH);
    }

    function setUpfrontBps(uint16 bps) external onlyOwner {
        require(bps <= 10000, "bps too high");
        upfrontBps = bps;
        emit UpfrontUpdated(bps);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _calcDeposit(Listing memory l, uint256 total) internal pure returns (uint256) {
        if (!l.requireDeposit) return 0;
        uint256 byBps = (total * l.depositBps) / 10000;
        uint256 cap = (total * l.depositCapBps) / 10000;
        return byBps < cap ? byBps : cap;
    }

    function rentWithNative(address nft, uint256 tokenId, uint64 hoursToRent) external payable nonReentrant whenNotPaused {
        require(hoursToRent >= minHours && hoursToRent <= maxHours, "hours out of range");
        bytes32 k = _key(nft, tokenId);
        Listing memory l = listings[k];
        require(l.active, "not listed");
        require(l.paymentToken == address(0), "use token method");
        require(deposits[k].amount == 0, "already rented");
        uint256 total = l.pricePerHour * hoursToRent;
        uint256 depositAmt = _calcDeposit(l, total);
        require(msg.value == total + depositAmt, "bad msg.value");

        // Calculate fee, upfront, escrow (hybrid escrow)
        uint256 fee = (total * platformFeeBps) / 10000;
        uint256 net = total - fee;
        uint256 upfront = (net * upfrontBps) / 10000;
        uint256 escrow = net - upfront; // stays in contract

        // Apply rental user rights
        uint64 expires = uint64(block.timestamp + hoursToRent * 1 hours);
        IERC4907(nft).setUser(tokenId, msg.sender, expires);

        // State updates (deposits and rental info) BEFORE transfers
        if (depositAmt > 0) {
            deposits[k] = HeldDeposit({ renter: msg.sender, token: address(0), amount: depositAmt });
        }
        rentals[k] = RentalInfo({
            renter: msg.sender,
            startTime: uint64(block.timestamp),
            duration: hoursToRent,
            totalPaid: total,
            paymentToken: address(0),
            feeBpsSnapshot: platformFeeBps,
            upfrontBpsSnapshot: upfrontBps
        });

        // Transfers after state update
        (bool s1, ) = feeRecipient.call{value: fee}(""); require(s1, "fee xfer");
        (bool s2, ) = l.owner.call{value: upfront}(""); require(s2, "owner upfront xfer");
        // escrow remains in contract balance

        emit Rented(nft, tokenId, msg.sender, hoursToRent, total, address(0), depositAmt);
    }

    function rentWithToken(address nft, uint256 tokenId, uint64 hoursToRent, uint256 amount, address erc20) external nonReentrant whenNotPaused {
        require(hoursToRent >= minHours && hoursToRent <= maxHours, "hours out of range");
        bytes32 k = _key(nft, tokenId);
        Listing memory l = listings[k];
        require(l.active, "not listed");
        require(l.paymentToken == erc20, "wrong token");
        require(deposits[k].amount == 0, "already rented");
        uint256 total = l.pricePerHour * hoursToRent;
        uint256 depositAmt = _calcDeposit(l, total);
        require(amount == total + depositAmt, "bad amount");

        uint256 fee = (total * platformFeeBps) / 10000;
        uint256 net = total - fee;
        uint256 upfront = (net * upfrontBps) / 10000;
        uint256 escrow = net - upfront;

        IERC20 token = IERC20(erc20);

        // Apply rental user rights first
        uint64 expires = uint64(block.timestamp + hoursToRent * 1 hours);
        IERC4907(nft).setUser(tokenId, msg.sender, expires);

        // State updates before transfers
        if (depositAmt > 0) {
            // deposit goes to contract
            require(token.transferFrom(msg.sender, address(this), depositAmt), "deposit xfer");
            deposits[k] = HeldDeposit({ renter: msg.sender, token: erc20, amount: depositAmt });
        }
        rentals[k] = RentalInfo({
            renter: msg.sender,
            startTime: uint64(block.timestamp),
            duration: hoursToRent,
            totalPaid: total,
            paymentToken: erc20,
            feeBpsSnapshot: platformFeeBps,
            upfrontBpsSnapshot: upfrontBps
        });

        // Transfers after state update
        require(token.transferFrom(msg.sender, feeRecipient, fee), "fee xfer");
        require(token.transferFrom(msg.sender, l.owner, upfront), "owner upfront xfer");
        if (escrow > 0) {
            require(token.transferFrom(msg.sender, address(this), escrow), "escrow xfer");
        }

        emit Rented(nft, tokenId, msg.sender, hoursToRent, total, erc20, depositAmt);
    }

    function returnNFTEarly(address nft, uint256 tokenId) external nonReentrant {
        bytes32 k = _key(nft, tokenId);
        RentalInfo memory r = rentals[k];
        require(r.renter == msg.sender, "not renter");

        // End rental immediately
        IERC4907(nft).setUser(tokenId, address(0), 0);

        // Compute snapshots
        uint256 fee = (r.totalPaid * r.feeBpsSnapshot) / 10000;
        uint256 net = r.totalPaid - fee;
        uint256 upfront = (net * r.upfrontBpsSnapshot) / 10000;
        uint256 escrow = net - upfront;

        // Calculate prorated split from escrow
        uint256 elapsed = block.timestamp - r.startTime;
        uint256 totalSeconds = uint256(r.duration) * 1 hours;
        if (elapsed > totalSeconds) elapsed = totalSeconds;
        uint256 ownerFromEscrow = escrow * elapsed / totalSeconds;
        uint256 renterRefund = escrow - ownerFromEscrow;

        // Effects
        delete rentals[k];

        // Interactions
        if (r.paymentToken == address(0)) {
            if (ownerFromEscrow > 0) { (bool s1, ) = listings[k].owner.call{value: ownerFromEscrow}(""); require(s1, "owner escrow xfer"); }
            if (renterRefund > 0) { (bool s2, ) = msg.sender.call{value: renterRefund}(""); require(s2, "refund failed"); }
        } else {
            IERC20 token = IERC20(r.paymentToken);
            if (ownerFromEscrow > 0) { require(token.transfer(listings[k].owner, ownerFromEscrow), "owner escrow xfer"); }
            if (renterRefund > 0) { require(token.transfer(msg.sender, renterRefund), "refund failed"); }
        }

        emit EarlyReturn(nft, tokenId, msg.sender, renterRefund);
    }

    function settleExpired(address nft, uint256 tokenId) external nonReentrant {
        bytes32 k = _key(nft, tokenId);
        RentalInfo memory r = rentals[k];
        require(r.renter != address(0), "no rental");
        require(IERC4907(nft).userOf(tokenId) == address(0), "not expired");

        // Compute snapshots
        uint256 fee = (r.totalPaid * r.feeBpsSnapshot) / 10000;
        uint256 net = r.totalPaid - fee;
        uint256 upfront = (net * r.upfrontBpsSnapshot) / 10000;
        uint256 escrow = net - upfront;

        // Effects first
        delete rentals[k];

        // Payout full escrow to owner
        address ownerAddr = listings[k].owner;
        if (r.paymentToken == address(0)) {
            if (escrow > 0) { (bool s, ) = ownerAddr.call{value: escrow}(""); require(s, "settle xfer"); }
        } else {
            IERC20 token = IERC20(r.paymentToken);
            if (escrow > 0) { require(token.transfer(ownerAddr, escrow), "settle xfer"); }
        }
        emit Settled(nft, tokenId, ownerAddr, escrow);
    }

    function refundDeposit(address nft, uint256 tokenId) external nonReentrant {
        bytes32 k = _key(nft, tokenId);
        Listing memory l = listings[k];
        require(l.active, "not listed");
        require(l.owner == msg.sender, "not owner");
        HeldDeposit memory hd = deposits[k];
        require(hd.amount > 0, "no deposit");
        require(IERC4907(nft).userOf(tokenId) == address(0), "not expired");

        delete deposits[k];
        if (hd.token == address(0)) {
            (bool s, ) = hd.renter.call{value: hd.amount}(""); require(s, "refund failed");
        } else {
            require(IERC20(hd.token).transfer(hd.renter, hd.amount), "refund failed");
        }
        emit DepositRefunded(nft, tokenId, hd.renter, hd.token, hd.amount);
    }

    function claimDeposit(address nft, uint256 tokenId) external nonReentrant {
        bytes32 k = _key(nft, tokenId);
        Listing memory l = listings[k];
        require(l.active, "not listed");
        require(l.owner == msg.sender, "not owner");
        HeldDeposit memory hd = deposits[k];
        require(hd.amount > 0, "no deposit");
        require(IERC4907(nft).userOf(tokenId) == address(0), "not expired");

        delete deposits[k];
        if (hd.token == address(0)) {
            (bool s, ) = l.owner.call{value: hd.amount}(""); require(s, "claim failed");
        } else {
            require(IERC20(hd.token).transfer(l.owner, hd.amount), "claim failed");
        }
        emit DepositClaimed(nft, tokenId, l.owner, hd.token, hd.amount);
    }
}
