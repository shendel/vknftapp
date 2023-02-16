import { Buffer } from 'buffer'
// @ts-ignore
window.Buffer = Buffer
import { base64encode } from 'nodejs-base64'

const INFURA_PROJECT_ID = process.env.REACT_APP_INFURA_PROJECT_ID
const INFURA_SECRET_KEY = process.env.REACT_APP_INFURA_SECRET_KEY
export const INFURA_AUTHORIZATION = "Basic " + base64encode(INFURA_PROJECT_ID + ":" + INFURA_SECRET_KEY)
console.log('>> INFURA', INFURA_AUTHORIZATION)
export const INFURA_API_ENDPOINT = "https://ipfs.infura.io:5001/api/v0"
