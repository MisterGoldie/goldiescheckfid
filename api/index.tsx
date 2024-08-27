import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import fetch from 'node-fetch'
import { pinata } from 'frog/hubs'

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$GOLDIES Token Tracker on Polygon',
  hub: pinata(),
})

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql';
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'; // Your Airstack API key
const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e';
const UNISWAP_API_URL = 'https://api.uniswap.org/v1/graphql';

async function getGoldiesBalance(address: string): Promise<string> {
  console.log('Fetching $GOLDIES balance for address:', address);
  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({
        query: `
          query GetTokenBalance($address: Identity!, $tokenAddress: Address!, $blockchain: TokenBlockchain!) {
            TokenBalances(
              input: {
                filter: {
                  owner: {_eq: $address},
                  tokenAddress: {_eq: $tokenAddress}
                },
                blockchain: $blockchain
              }
            ) {
              TokenBalance {
                amount
                formattedAmount
              }
            }
          }
        `,
        variables: {
          address: address,
          tokenAddress: GOLDIES_TOKEN_ADDRESS,
          blockchain: "polygon"
        }
      })
    });

    if (!response.ok) {
      console.error('Airstack API response not OK. Status:', response.status);
      const responseText = await response.text();
      console.error('Response body:', responseText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API response data:', JSON.stringify(data, null, 2));

    if (data.data && data.data.TokenBalances && data.data.TokenBalances.TokenBalance && data.data.TokenBalances.TokenBalance[0]) {
      const balance = data.data.TokenBalances.TokenBalance[0].formattedAmount;
      console.log('Fetched $GOLDIES balance:', balance);
      return balance;
    }

    console.error('No balance data found in Airstack response');
    return "0";
  } catch (error) {
    console.error('Error in getGoldiesBalance:', error);
    throw error;
  }
}

async function getGoldiesUsdPrice(): Promise<number> {
  try {
    console.log('Fetching $GOLDIES price from Uniswap...')
    const response = await fetch(UNISWAP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://app.uniswap.org'
      },
      body: JSON.stringify({
        query: `
          query {
            token(id: "${GOLDIES_TOKEN_ADDRESS.toLowerCase()}", chain: POLYGON) {
              market(currency: USD) {
                price
              }
            }
          }
        `
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json()
    console.log('Uniswap API response:', JSON.stringify(data, null, 2))

    if (data.data && data.data.token && data.data.token.market && data.data.token.market.price) {
      const priceUsd = parseFloat(data.data.token.market.price)
      console.log('Fetched $GOLDIES price in USD:', priceUsd)
      return priceUsd
    } else {
      console.error('Invalid or missing price data in Uniswap response:', data)
      throw new Error('Invalid price data received from Uniswap')
    }
  } catch (error) {
    console.error('Error in getGoldiesUsdPrice:', error)
    throw error
  }
}

async function getConnectedAddress(fid: number): Promise<string | null> {
  console.log('Attempting to fetch connected address for FID:', fid);
  try {
    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY
      },
      body: JSON.stringify({
        query: `
          query GetFarcasterUser($fid: String!) {
            Socials(
              input: {filter: {dappName: {_eq: farcaster}, userId: {_eq: $fid}}, blockchain: ethereum}
            ) {
              Social {
                userAssociatedAddresses
              }
            }
          }
        `,
        variables: {
          fid: fid.toString()
        }
      })
    });

    if (!response.ok) {
      console.error('Airstack API response not OK. Status:', response.status);
      const responseText = await response.text();
      console.error('Response body:', responseText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API response data:', JSON.stringify(data, null, 2));

    if (data.data && data.data.Socials && data.data.Socials.Social && data.data.Socials.Social[0]) {
      const addresses = data.data.Socials.Social[0].userAssociatedAddresses;
      if (addresses && addresses.length > 0) {
        return addresses[0]; // Return the first associated address
      }
    }

    console.error('No associated Ethereum address found in Airstack response');
    return null;
  } catch (error) {
    console.error('Error in getConnectedAddress:', error);
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

  const { fid } = c.frameData || {};

  console.log('FID:', fid);

  let balanceDisplay = "Unable to fetch balance"
  let usdValueDisplay = ""
  let priceUsd = 0
  let errorDetails = ""

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
    console.log('Connected Ethereum address:', connectedAddress);

    console.log('Fetching balance and price')
    const balance = await getGoldiesBalance(connectedAddress)
    priceUsd = await getGoldiesUsdPrice()

    const balanceNumber = parseFloat(balance)
    balanceDisplay = balanceNumber === 0 
      ? "You don't have any $GOLDIES tokens yet!"
      : `${balanceNumber.toLocaleString()} $GOLDIES`

    const usdValue = balanceNumber * priceUsd
    usdValueDisplay = `(~$${usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`
  } catch (error) {
    console.error('Error in balance check:', error)
    balanceDisplay = "Error fetching balance"
    usdValueDisplay = "Unable to calculate USD value"
    errorDetails = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error'
  }

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $GOLDIES Balance</h1>
        <p style={{ fontSize: '32px', textAlign: 'center' }}>FID: {fid}</p>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{balanceDisplay}</p>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{usdValueDisplay}</p>
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