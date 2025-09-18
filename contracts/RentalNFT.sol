// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC4907} from "./ERC4907.sol";
import {IERC4907} from "./IERC4907.sol";

contract RentalNFT is ERC4907, Ownable {
    uint256 private _tokenIdTracker;

    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC721(name_, symbol_) Ownable(initialOwner) {}

    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = ++_tokenIdTracker;
        _safeMint(to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return interfaceId == type(IERC4907).interfaceId || super.supportsInterface(interfaceId);
    }
}
