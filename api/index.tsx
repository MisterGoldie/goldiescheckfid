import { Button, Frog } from 'frog';
import { handle } from 'frog/vercel';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { neynar } from 'frog/middlewares';

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$GOLDIES Token Tracker on Polygon',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
);

const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e';
const ALCHEMY_POLYGON_URL = 'https://polygon-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao';
const POLYGON_CHAIN_ID = 137;
const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e';

const ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

interface ConnectedAddress {
  address: string;
  blockchain: string;
}

interface Social {
  dappName: string;
  profileName: string;
  userAddress: string;
  connectedAddresses: ConnectedAddress[];
}

async function getConnectedAddresses(fid: string): Promise<string[]> {
  console.log('Attempting to fetch connected addresses for FID:', fid);
  try {
    const query = `
      query ConnectedWalletWithFID($fid: String!) {
        Socials(input: {filter: {userId: {_eq: $fid}}, blockchain: ethereum}) {
          Social {
            dappName
            profileName
            userAddress
            connectedAddresses {
              address
              blockchain
            }
          }
        }
      }
    `;

    const variables = { fid };

    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Full Airstack API response:', JSON.stringify(data, null, 2));

    if (!data.data || !data.data.Socials || !data.data.Socials.Social) {
      console.error('Unexpected response structure from Airstack API');
      return [];
    }

    const addresses = data.data.Socials.Social.flatMap((social: Social) =>
      social.connectedAddresses.map((addr: ConnectedAddress) => addr.address)
    );

    console.log('Connected addresses:', addresses);
    return addresses;
  } catch (error) {
    console.error('Error in getConnectedAddresses:', error);
    return [];
  }
}

async function getGoldiesBalance(address: string): Promise<string> {
  try {
    console.log('Fetching balance for address:', address);
    const provider = new ethers.JsonRpcProvider(ALCHEMY_POLYGON_URL, POLYGON_CHAIN_ID);
    const contract = new ethers.Contract(GOLDIES_TOKEN_ADDRESS, ABI, provider);

    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();

    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log('Fetched balance:', formattedBalance);
    return formattedBalance;
  } catch (error) {
    console.error('Error in getGoldiesBalance:', error);
    return 'Error: Unable to fetch balance';
  }
}

async function getGoldiesUsdPrice(): Promise<number> {
  try {
    console.log('Fetching $GOLDIES price from DEX Screener...');
    const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/polygon/0x19976577bb2fa3174b4ae4cf55e6795dde730135');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('DEX Screener API response:', JSON.stringify(data, null, 2));

    if (data.pair && data.pair.priceUsd) {
      const priceUsd = parseFloat(data.pair.priceUsd);
      console.log('Fetched $GOLDIES price in USD:', priceUsd);
      return priceUsd;
    } else {
      console.error('Invalid or missing price data in DEX Screener response:', data);
      throw new Error('Invalid price data received from DEX Screener');
    }
  } catch (error) {
    console.error('Error in getGoldiesUsdPrice:', error);
    throw error;
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
        boxSizing: 'border-box',
      }}>
        <h1 style={{
          fontSize: '60px',
          marginBottom: '20px',
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        }}>$GOLDIES Balance Checker</h1>
        <p style={{
          fontSize: '36px',
          marginBottom: '20px',
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        }}>Click to check your $GOLDIES balance</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Balance</Button>,
    ],
  });
});

app.frame('/check', async (c) => {
  console.log('Full frameData:', JSON.stringify(c.frameData, null, 2));

  const { fid } = c.frameData || {};
  const { displayName, pfpUrl } = c.var.interactor || {};

  console.log('FID:', fid);
  console.log('Display Name:', displayName);
  console.log('Profile Picture URL:', pfpUrl);

  let balanceDisplay = "Unable to fetch balance";
  let usdValueDisplay = "";
  let priceUsd = 0;
  let errorDetails = "";

  try {
    if (!fid) {
      console.error('No FID found in frameData');
      throw new Error('No FID found for the user.');
    }

    console.log('Attempting to get connected addresses for FID:', fid);
    const connectedAddresses = await getConnectedAddresses(fid.toString());
    if (connectedAddresses.length === 0) {
      console.error('Failed to fetch connected Ethereum addresses for FID:', fid);
      throw new Error('Unable to fetch connected Ethereum addresses');
    }

    // Prioritize the most recently connected or active address
    const address = connectedAddresses[0];
    console.log('Using Ethereum address:', address);

    console.log('Fetching balance and price');
    const balance = await getGoldiesBalance(address);
    console.log('Fetched balance:', balance);
    priceUsd = await getGoldiesUsdPrice();
    console.log('Fetched price:', priceUsd);

    const balanceNumber = parseFloat(balance);
    balanceDisplay = balanceNumber === 0 
      ? "You don't have any $GOLDIES tokens on Polygon yet!"
      : `${balanceNumber.toLocaleString()} $GOLDIES`;

    const usdValue = balanceNumber * priceUsd;
    usdValueDisplay = `(~$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)`;

    console.log('Final balance display:', balanceDisplay);
    console.log('Final USD value display:', usdValueDisplay);
  } catch (error) {
    console.error('Detailed error in balance check:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    balanceDisplay = "Error fetching balance";
    usdValueDisplay = "Unable to calculate USD value";
    errorDetails = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
  }

  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: 'url(https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/Qme8LxFBeuJhKNdNV1M6BjRkYPDxQddo2eHiPhYaEdALvz)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px', 
        boxSizing: 'border-box' 
      }}>
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
          <p style={{ fontSize: '40px', textAlign: 'center' }}>{displayName || `FID: ${fid}` || 'Unknown User'}</p>
        </div>
        <p style={{ fontSize: '52px', textAlign: 'center' }}>{balanceDisplay}</p>
        <p style={{ fontSize: '48px', textAlign: 'center' }}>{usdValueDisplay}</p>
        {priceUsd > 0 && <p style={{ fontSize: '34px', marginTop: '10px', textAlign: 'center' }}>Price: ${priceUsd.toFixed(8)} USD</p>}
        {errorDetails && <p style={{ fontSize: '26px', color: 'red', marginTop: '10px', textAlign: 'center' }}>Error: {errorDetails}</p>}
      </div>
    ),
    intents: [
      <Button action="/">Back</Button>,
      <Button.Link href="https://polygonscan.com/token/0x3150e01c36ad3af80ba16c1836efcd967e96776e">Polygonscan</Button.Link>,
      <Button action="/check">Refresh</Button>,
    ],
  });
});

export const GET = handle(app);
export const POST = handle(app);