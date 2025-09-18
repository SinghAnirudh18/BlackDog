// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC4907} from "./IERC4907.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

abstract contract ERC4907 is ERC721, IERC4907 {
    struct UserInfo { address user; uint64 expires; }
    mapping(uint256 => UserInfo) internal _users;

    function setUser(uint256 tokenId, address user, uint64 expires) public virtual override {
        require(_isAuthorized(_ownerOf(tokenId), _msgSender(), tokenId), "ERC4907: not authorized");
        _users[tokenId] = UserInfo(user, expires);
        emit UpdateUser(tokenId, user, expires);
    }

    function userOf(uint256 tokenId) public view virtual override returns (address) {
        if (uint256(_users[tokenId].expires) >= block.timestamp) {
            return _users[tokenId].user;
        }
        return address(0);
    }

    function userExpires(uint256 tokenId) public view virtual override returns (uint256) {
        return _users[tokenId].expires;
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != to && _users[tokenId].user != address(0)) {
            delete _users[tokenId];
            emit UpdateUser(tokenId, address(0), 0);
        }
        return from;
    }
}
