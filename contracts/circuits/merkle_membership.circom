pragma circom 2.0.0;

include "./node_modules/circomlib/circuits/poseidon.circom";
include "./node_modules/circomlib/circuits/mux1.circom";

/*
 * MerkleMembership
 * 
 * This circuit verifies that a given address is part of a Merkle tree
 * without revealing which specific leaf (position) it occupies.
 * 
 * Inputs:
 *   - address (private): The Ethereum address to prove membership for
 *   - pathIndices[levels] (private): Binary path from leaf to root (0=left, 1=right)
 *   - siblings[levels] (private): Sibling hashes along the path
 *   - root (public): The Merkle root to verify against
 * 
 * Output:
 *   - Valid proof if address is in the tree with the given root
 */

template MerkleTreeChecker(levels) {
    // Private inputs
    signal input address;                    // Ethereum address (as field element)
    signal input pathIndices[levels];        // Binary path: 0 or 1 for each level
    signal input siblings[levels];           // Sibling hashes at each level
    
    // Public input
    signal input root;                       // Expected Merkle root
    
    // Start with the leaf hash (hash of the address)
    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== address;
    
    signal computedHash[levels + 1];
    computedHash[0] <== leafHasher.out;
    
    // Components for hashing at each level
    component hashers[levels];
    component leftMux[levels];
    component rightMux[levels];
    
    // For each level, compute the parent hash
    for (var i = 0; i < levels; i++) {
        // Use Mux1 to select left and right based on pathIndices[i]
        leftMux[i] = Mux1();
        rightMux[i] = Mux1();
        
        // For left: if pathIndices[i] == 0, use computedHash[i], else use siblings[i]
        leftMux[i].c[0] <== computedHash[i];
        leftMux[i].c[1] <== siblings[i];
        leftMux[i].s <== pathIndices[i];
        
        // For right: if pathIndices[i] == 0, use siblings[i], else use computedHash[i]
        rightMux[i].c[0] <== siblings[i];
        rightMux[i].c[1] <== computedHash[i];
        rightMux[i].s <== pathIndices[i];
        
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== leftMux[i].out;
        hashers[i].inputs[1] <== rightMux[i].out;
        
        computedHash[i + 1] <== hashers[i].out;
    }
    
    // Final computed root must equal the public root
    root === computedHash[levels];
}

/*
 * Main component with 10 levels (supports up to 2^10 = 1024 addresses)
 */
component main {public [root]} = MerkleTreeChecker(10);
