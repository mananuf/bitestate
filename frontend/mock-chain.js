/**
 * Mocking the Midl x Bitcoin Smart Contract Environment
 * Simulates a Blockchain state, network latency, and transaction signing.
 */

class MockMidlChain {
    constructor() {
        this.networkDelay = 2000; // Simulate 2 seconds network latency
        
        // Initial Blockchain State (Mock Properties)
        this.properties = [
            {
                id: 1,
                title: "Luxury Condo in Neo-Tokyo",
                location: "Shibuya District",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
                priceBtc: 2.5,
                owner: "0xSystem",
                isSold: false
            },
            {
                id: 2,
                title: "Minimalist Villa",
                location: "Bali, Indonesia",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
                priceBtc: 8.0,
                owner: "0xSystem",
                isSold: false
            },
            {
                id: 3,
                title: "Cyberpunk Penthouse",
                location: "Night City",
                image: "https://images.unsplash.com/photo-1515263487990-61b07816bc32?w=800&q=80",
                priceBtc: 4.2,
                owner: "0xSystem",
                isSold: false
            },
            {
                id: 4,
                title: "Bitcoin Citadel Outpost",
                location: "El Salvador",
                image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
                priceBtc: 15.0,
                owner: "0xUser123",
                isSold: true
            }
        ];
    }

    /**
     * Simulates fetching properties from the Midl RPC network.
     */
    async getProperties() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([...this.properties]);
            }, 800); // Slight delay for reading state
        });
    }

    /**
     * Simulates a Smart Contract function call: `buyProperty(uint256 propertyId)`
     * Requires the user address and exact BTC amount.
     */
    async buyProperty(propertyId, buyerAddress, amountBtc) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const propertyIndex = this.properties.findIndex(p => p.id === propertyId);
                
                if (propertyIndex === -1) {
                    return reject(new Error("Property not found on-chain."));
                }
                
                const property = this.properties[propertyIndex];

                if (property.isSold) {
                    return reject(new Error("Property is already sold."));
                }

                if (amountBtc < property.priceBtc) {
                    return reject(new Error("Insufficient BTC transferred."));
                }

                // Execute "smart contract" state change
                this.properties[propertyIndex].isSold = true;
                this.properties[propertyIndex].owner = buyerAddress;

                // Return a mock transaction receipt
                resolve({
                    success: true,
                    txHash: "0x" + Math.random().toString(16).substring(2, 18) + "..." + Math.random().toString(16).substring(2, 10),
                    propertyId: propertyId,
                    newOwner: buyerAddress,
                    blockNumber: Math.floor(Math.random() * 800000) + 100000
                });
                
            }, this.networkDelay); 
        });
    }
}

// Export as a global instance for the vanilla JS app.
window.midlChain = new MockMidlChain();
