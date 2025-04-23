// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@project-serum/anchor');
const fs = require('fs');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Load IDL
const idlFile = JSON.parse(fs.readFileSync(process.env.IDL_PATH, 'utf8'));

// Program ID from your contract
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);

// Network connection
const NETWORK = process.env.SOLANA_NETWORK;
console.log(`Connecting to Solana network: ${NETWORK}`);

// Load wallet from file
const keypairData = JSON.parse(fs.readFileSync(process.env.KEYPAIR_FILE, 'utf8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
console.log(`Using wallet public key: ${keypair.publicKey.toString()}`);

// Create connection
const connection = new Connection(NETWORK, 'confirmed');

// Create provider and program
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { 
  commitment: 'confirmed',
  preflightCommitment: 'confirmed',
});
const program = new Program(idlFile, PROGRAM_ID, provider);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const blockHeight = await connection.getBlockHeight();
    
    res.status(200).json({
      status: 'ok',
      solana: {
        network: NETWORK,
        blockHeight
      },
      programId: PROGRAM_ID.toString(),
      walletAddress: wallet.publicKey.toString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Initialize Product Endpoint
 * Registers a new product on the blockchain
 */
app.post('/api/products', async (req, res) => {
  try {
    const { nfcId, productId } = req.body;

    // Validate input
    if (!nfcId || !productId) {
      return res.status(400).json({ error: 'NFC ID and Product ID are required' });
    }

    // Find the product account PDA
    const [productAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("product"),
        wallet.publicKey.toBuffer(),
        Buffer.from(nfcId),
      ],
      program.programId
    );

    console.log(`Initializing product: NFC ID=${nfcId}, Product ID=${productId}`);
    console.log(`Product account: ${productAccount.toString()}`);

    // Call the program method
    const tx = await program.methods
      .initializeProduct(nfcId, productId)
      .accounts({
        authority: wallet.publicKey,
        productAccount: productAccount,
        systemProgram: require('@solana/web3.js').SystemProgram.programId,
      })
      .rpc();

    console.log(`Transaction successful: ${tx}`);

    res.status(201).json({
      success: true,
      transaction: tx,
      productAccount: productAccount.toString(),
      nfcId,
      productId,
      owner: wallet.publicKey.toString()
    });
  } catch (error) {
    console.error('Error initializing product:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.logs || error.stack
    });
  }
});

/**
 * Verify Product Endpoint
 * Verifies if a product exists and is authentic
 */
app.get('/api/products/verify/:nfcId', async (req, res) => {
  try {
    const { nfcId } = req.params;

    // Validate input
    if (!nfcId) {
      return res.status(400).json({ error: 'NFC ID is required' });
    }

    console.log(`Verifying product with NFC ID: ${nfcId}`);

    // Find the product account PDA
    const [productAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("product"),
        wallet.publicKey.toBuffer(),
        Buffer.from(nfcId),
      ],
      program.programId
    );

    console.log(`Product account: ${productAccount.toString()}`);

    try {
      // Call the program method
      const result = await program.methods
        .verifyProduct(nfcId)
        .accounts({
          authority: wallet.publicKey,
          productAccount: productAccount,
        })
        .view();

      console.log(`Verification result: ${result}`);

      res.status(200).json({
        success: true,
        isAuthentic: result,
        productAccount: productAccount.toString(),
        nfcId
      });
    } catch (error) {
      console.log(`Verification failed: ${error.message}`);
      // If verification fails, it's not an authentic product
      res.status(200).json({
        success: true,
        isAuthentic: false,
        error: error.message,
        nfcId
      });
    }
  } catch (error) {
    console.error('Error verifying product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Product Details Endpoint
 * Fetches the details of a registered product
 */
app.get('/api/products/:nfcId', async (req, res) => {
  try {
    const { nfcId } = req.params;

    // Validate input
    if (!nfcId) {
      return res.status(400).json({ error: 'NFC ID is required' });
    }

    console.log(`Getting details for product with NFC ID: ${nfcId}`);

    // Find the product account PDA
    const [productAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from("product"),
        wallet.publicKey.toBuffer(),
        Buffer.from(nfcId),
      ],
      program.programId
    );

    console.log(`Product account: ${productAccount.toString()}`);

    try {
      // Fetch the account data
      const accountInfo = await program.account.productAccount.fetch(productAccount);
      
      res.status(200).json({
        success: true,
        product: {
          owner: accountInfo.owner.toString(),
          nfcId: accountInfo.nfcId,
          productId: accountInfo.productId,
          productAccount: productAccount.toString()
        }
      });
    } catch (error) {
      console.log(`Failed to get product details: ${error.message}`);
      // If the account doesn't exist or there's an error
      res.status(404).json({
        success: false,
        error: 'Product not found',
        details: error.message,
        nfcId
      });
    }
  } catch (error) {
    console.error('Error getting product details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List All Products
 * Gets a list of all registered products
 */
app.get('/api/products', async (req, res) => {
  try {
    console.log('Fetching all products');
    
    // Fetch all product accounts for this program
    const accounts = await program.account.productAccount.all();
    
    console.log(`Found ${accounts.length} products`);
    
    // Map to a user-friendly format
    const products = accounts.map(item => ({
      owner: item.account.owner.toString(),
      nfcId: item.account.nfcId,
      productId: item.account.productId,
      productAccount: item.publicKey.toString()
    }));

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Authlink Solana API Server running on port ${PORT}`);
  console.log(`Using wallet: ${wallet.publicKey.toString()}`);
  console.log(`Connected to network: ${NETWORK}`);
  console.log(`Program ID: ${PROGRAM_ID.toString()}`);
});