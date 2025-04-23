# Authlink Solana Backend

A Node.js API server that interacts with a Solana blockchain smart contract to register and verify products using NFC technology.

## Overview

This server provides an API for:
- Registering new products with NFC IDs on the Solana blockchain
- Verifying product authenticity using NFC IDs
- Retrieving product details
- Listing all registered products

The server integrates with a Solana Anchor program deployed on the devnet.

## Prerequisites

- Node.js (v14 or higher)
- npm
- Solana CLI tools
- Access to Solana devnet

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Aadil1505/Authlink-Solana-Node-Backend.git
cd authlink-solana-node-backend
```

### 2. Install Dependencies

```bash
npm install express cors body-parser dotenv @solana/web3.js @project-serum/anchor
```

### 3. Create a Solana Wallet

If you don't have a Solana wallet yet, create one:

```bash
solana-keygen new --outfile keypair.json
```

This will generate a new Solana keypair and save it to `keypair.json`.

### 4. Get Your Public Key

To get your public key from the generated keypair:

```bash
solana address -k keypair.json
```

### 5. Fund Your Wallet on Devnet

```bash
solana airdrop 2 YOUR_PUBLIC_KEY --url https://api.devnet.solana.com
```

Replace `YOUR_PUBLIC_KEY` with the public key you obtained in the previous step.

Verify your balance:

```bash
solana balance YOUR_PUBLIC_KEY --url https://api.devnet.solana.com
```

### 6. Create Environment Configuration

Create a `.env` file in the project root:

```
PORT=3001
PROGRAM_ID=**************************
SOLANA_NETWORK=https://api.devnet.solana.com
IDL_PATH=./idl.json
KEYPAIR_FILE=./keypair.json
```

Make sure to replace `PROGRAM_ID` with your actual deployed program ID.

### 7. Prepare the IDL File

Copy your Solana program's IDL file to `idl.json`. If you've built your Anchor program, this file should be available in its target directory.

### 8. Start the Server

```bash
node server.js
```

You should see output confirming that the server is running, with details about the connected wallet and program ID.

## API Endpoints

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Register a Product
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{"nfcId": "nfc123", "productId": "product123"}'
```

### Verify a Product
```bash
curl http://localhost:3001/api/products/verify/nfc123
```

### Get Product Details
```bash
curl http://localhost:3001/api/products/nfc123
```

### List All Products
```bash
curl http://localhost:3001/api/products
```

## Development

### Error Handling

If you encounter issues:
1. Check that your Solana wallet is properly funded
2. Verify your program ID is correct
3. Ensure the IDL file path is correct
4. Look for error messages in the server logs

### Security Considerations

- Keep your keypair.json file secure and never commit it to version control
- In production, consider using more secure methods for private key management
- Add proper authentication for your API endpoints before deploying to production

## Next Steps

- Integrate with NextJS Frontend
- Add authentication to the API endpoints
- Implement rate limiting
- Set up monitoring and logging

