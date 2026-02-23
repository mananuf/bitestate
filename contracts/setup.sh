#!/bin/bash
set -e

echo "=== Cleaning environment ==="
rm -rf node_modules package-lock.json pnpm-lock.yaml

echo "=== Installing packages (Hardhat 2 + TS-Node + Midl Viem) ==="
pnpm install

echo "=== Success! Generating your Regtest Address ==="
pnpm hardhat midl:address


Bitcoin Address: bcrt1qquv9lg5g2r4jkr0ahun0ddfg5xntxjelwjpnuw (p2wpkh)
EVM Address: 0xC352456F2121D9087e91CddCFdBcc21573580D04