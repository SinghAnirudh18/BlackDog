// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC4907 {
    // Emitted when the `user` of an NFT or the `expires` of the `user` is changed
    event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires);

    // Sets the user and expires of an NFT
    function setUser(uint256 tokenId, address user, uint64 expires) external;

    // Returns the user address of an NFT
    function userOf(uint256 tokenId) external view returns (address);

    // Returns the user expires of an NFT
    function userExpires(uint256 tokenId) external view returns (uint256);
}
