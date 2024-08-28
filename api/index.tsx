import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { ethers } from 'ethers'
import fetch from 'node-fetch'
import { neynar } from 'frog/middlewares'

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$GOLDIES Token Tracker on Polygon',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
)

const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e'
const ALCHEMY_POLYGON_URL = 'https://polygon-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const ALCHEMY_MAINNET_URL = 'https://eth-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const POLYGON_CHAIN_ID = 137
const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster'
const NEYNAR_API_KEY = 'NEYNAR_FROG_FM'

const ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

async function resolveAddress(input: unknown): Promise<string> {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error('Invalid input: Address or ENS name must be a non-empty string');
  }

  const trimmedInput = input.trim();

  if (ethers.isAddress(trimmedInput)) {
    return trimmedInput;
  }

  if ((trimmedInput as string).endsWith('.eth')) {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_MAINNET_URL);
    try {
      const address = await provider.resolveName(trimmedInput);
      if (address) {
        return address;
      }
    } catch (error) {
      console.error('Error resolving ENS name:', error);
    }
  }

  throw new Error('Invalid address or ENS name');
}

async function getGoldiesBalance(address: string): Promise<string> {
  try {
    console.log('Fetching balance for address:', address)
    const provider = new ethers.JsonRpcProvider(ALCHEMY_POLYGON_URL, POLYGON_CHAIN_ID)
    const contract = new ethers.Contract(GOLDIES_TOKEN_ADDRESS, ABI, provider)

    const balance = await contract.balanceOf(address)
    const decimals = await contract.decimals()

    const formattedBalance = ethers.formatUnits(balance, decimals)
    console.log('Fetched balance:', formattedBalance)
    return formattedBalance
  } catch (error) {
    console.error('Detailed error in getGoldiesBalance:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return 'Error: Unable to fetch balance'
  }
}

async function getGoldiesUsdPrice(): Promise<number> {
  try {
    console.log('Fetching $GOLDIES price from DEX Screener...')
    const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/polygon/0x19976577bb2fa3174b4ae4cf55e6795dde730135')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json()
    console.log('DEX Screener API response:', JSON.stringify(data, null, 2))

    if (data.pair && data.pair.priceUsd) {
      const priceUsd = parseFloat(data.pair.priceUsd)
      console.log('Fetched $GOLDIES price in USD:', priceUsd)
      return priceUsd
    } else {
      console.error('Invalid or missing price data in DEX Screener response:', data)
      throw new Error('Invalid price data received from DEX Screener')
    }
  } catch (error) {
    console.error('Detailed error in getGoldiesUsdPrice:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}

async function getConnectedAddress(fid: number): Promise<string | null> {
  console.log('Attempting to fetch connected address for FID:', fid);
  try {
    const url = `${NEYNAR_API_URL}/user?fid=${fid}`;
    console.log('Neynar API URL:', url);
    const response = await fetch(url, {
      headers: {
        'api_key': NEYNAR_API_KEY
      }
    });
    console.log('Neynar API response status:', response.status);
    if (!response.ok) {
      console.error('Neynar API response not OK. Status:', response.status);
      const responseText = await response.text();
      console.error('Response body:', responseText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Neynar API response data:', JSON.stringify(data, null, 2));
    
    if (!data.result || !data.result.user || !data.result.user.custody_address) {
      console.error('Unexpected response structure from Neynar API:', JSON.stringify(data, null, 2));
      return null;
    }
    
    console.log('Successfully fetched connected address:', data.result.user.custody_address);
    return data.result.user.custody_address;
  } catch (error) {
    console.error('Detailed error in getConnectedAddress:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: 'url(https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVfEoPSGHFGByQoGxUUwPq2qzE4uKXT7CSKVaigPANmjZ)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px', 
        boxSizing: 'border-box' 
      }}>
        <h1 style={{ 
          fontSize: '60px', 
          marginBottom: '20px', 
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>$GOLDIES Balance Checker</h1>
        <p style={{ 
          fontSize: '36px', 
          marginBottom: '20px', 
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>Click to check your $GOLDIES balance</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Balance</Button>,
    ]
  })
})

app.frame('/check', async (c) => {
  console.log('Full frameData:', JSON.stringify(c.frameData, null, 2));
  console.log('Full context:', JSON.stringify(c, null, 2));

  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

  console.log('FID:', fid);
  console.log('Display Name:', displayName);
  console.log('Profile Picture URL:', pfpUrl);

  let balanceDisplay = "Unable to fetch balance"
  let usdValueDisplay = ""
  let priceUsd = 0
  let errorDetails = ""
  let address = ""

  try {
    if (!fid) {
      console.error('No FID found in frameData');
      throw new Error('No FID found for the user.')
    }

    console.log('Attempting to get connected address for FID:', fid);
    const connectedAddress = await getConnectedAddress(fid);
    if (!connectedAddress) {
      console.error('Failed to fetch connected Ethereum address for FID:', fid);
      throw new Error('Unable to fetch connected Ethereum address');
    }
    
    // Use resolveAddress to ensure it's being used (resolving TypeScript warning)
    address = await resolveAddress(connectedAddress);
    console.log('Resolved address:', address);

    console.log('Fetching balance and price')
    const balance = await getGoldiesBalance(address)
    console.log('Fetched balance:', balance);
    priceUsd = await getGoldiesUsdPrice()
    console.log('Fetched price:', priceUsd);

    const balanceNumber = parseFloat(balance)
    balanceDisplay = balanceNumber === 0 
      ? "You don't have any $GOLDIES tokens yet!"
      : `${balanceNumber.toLocaleString()} $GOLDIES`

    const usdValue = balanceNumber * priceUsd
    usdValueDisplay = `(~$${usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`
    
    console.log('Final balance display:', balanceDisplay);
    console.log('Final USD value display:', usdValueDisplay);
  } catch (error) {
    console.error('Detailed error in balance check:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    balanceDisplay = "Error fetching balance"
    usdValueDisplay = "Unable to calculate USD value"
    errorDetails = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error'
  }

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $GOLDIES Balance</h1>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          {pfpUrl ? (
            <img 
              src={pfpUrl} 
              alt="Profile" 
              style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px' }}
            />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <p style={{ fontSize: '32px', textAlign: 'center' }}>{displayName || `FID: ${fid}` || 'Unknown User'}</p>
        </div>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{balanceDisplay}</p>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{usdValueDisplay}</p>
        <p style={{ fontSize: '32px', marginTop: '20px', textAlign: 'center' }}>Address: {address}</p>
        <p style={{ fontSize: '32px', marginTop: '10px', textAlign: 'center' }}>Network: Polygon (Chain ID: {POLYGON_CHAIN_ID})</p>
        {priceUsd > 0 && <p style={{ fontSize: '26px', marginTop: '10px', textAlign: 'center' }}>Price: ${priceUsd.toFixed(8)} USD</p>}
        {errorDetails && <p style={{ fontSize: '18px', color: 'red', marginTop: '10px', textAlign: 'center' }}>Error: {errorDetails}</p>}
      </div>
    ),
    intents: [
      <Button action="/">Back</Button>,
      <Button.Link href="https://polygonscan.com/token/0x3150e01c36ad3af80ba16c1836efcd967e96776e">Polygonscan</Button.Link>,
      <Button action="/check">Refresh</Button>,
    ]
  })
})

export const GET = handle(app)
export const POST = handle(app)