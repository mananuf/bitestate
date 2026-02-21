// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BitEstate {
    struct Property {
        uint256 id;
        address payable owner;
        uint256 price; // in sats or default token
        string metadataURI;
        bool isListed;
    }

    uint256 private _propertyIds;
    mapping(uint256 => Property) public properties;

    event PropertyListed(uint256 indexed propertyId, address indexed owner, uint256 price, string metadataURI);
    event PropertySold(uint256 indexed propertyId, address indexed oldOwner, address indexed newOwner, uint256 price);

    function listProperty(uint256 price, string memory metadataURI) public returns (uint256) {
        require(price > 0, "Price must be greater than zero");

        _propertyIds++;
        uint256 newPropertyId = _propertyIds;

        properties[newPropertyId] = Property({
            id: newPropertyId,
            owner: payable(msg.sender),
            price: price,
            metadataURI: metadataURI,
            isListed: true
        });

        emit PropertyListed(newPropertyId, msg.sender, price, metadataURI);
        return newPropertyId;
    }

    function buyProperty(uint256 propertyId) public payable {
        Property storage property = properties[propertyId];
        
        require(property.isListed, "Property is not listed for sale");
        require(msg.value >= property.price, "Insufficient funds transferred");
        require(msg.sender != property.owner, "Owner cannot buy their own property");

        address payable oldOwner = property.owner;
        uint256 salePrice = property.price;

        // Update ownership
        property.owner = payable(msg.sender);
        property.isListed = false;

        // Transfer funds
        (bool success, ) = oldOwner.call{value: salePrice}("");
        require(success, "Transfer failed");

        // Refund excess if any
        if (msg.value > salePrice) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - salePrice}("");
            require(refundSuccess, "Refund failed");
        }

        emit PropertySold(propertyId, oldOwner, msg.sender, salePrice);
    }
}
