import NftContractData from "./StakeNFT.json"
import Web3 from 'web3'
import { calcSendArgWithFee } from "./calcSendArgWithFee"
import { BigNumber } from 'bignumber.js'

const callNftMethod = (options) => {
  return new Promise((resolve, reject) => {
    const {
      activeWeb3,
      contractAddress,
      method,
      args,
      weiAmount,
      calcPrice
    } = options
    const onTrx = options.onTrx || (() => {})
    const onSuccess = options.onSuccess || (() => {})
    const onError = options.onError || (() => {})
    const onFinally = options.onFinally || (() => {})

    activeWeb3.eth.getAccounts().then(async (accounts) => {
      if (accounts.length>0) {
        const activeWallet = accounts[0]
        const nftContract = new activeWeb3.eth.Contract(NftContractData.abi, contractAddress)

        console.log('>> amount', weiAmount)
        const sendArgs = await calcSendArgWithFee(
          activeWallet,
          nftContract,
          method,
          args || [],
          weiAmount
        )
        const gasPrice = await activeWeb3.eth.getGasPrice()
        sendArgs.gasPrice = gasPrice
        console.log('>> amount 2', gasPrice, weiAmount, sendArgs)

        if (calcPrice) {
          console.log( new BigNumber(gasPrice * 1.05).multipliedBy(sendArgs.gas).toFixed() )
          resolve(
            new BigNumber(gasPrice * 1).multipliedBy(sendArgs.gas).plus(weiAmount).toFixed()
          )
          return
        }
        nftContract.methods[method](...(args || []))
          .send(sendArgs)
          .on('transactionHash', (hash) => {
            console.log('transaction hash:', hash)
            onTrx(hash)
          })
          .on('error', (error) => {
            // Transaction was not mined within 50 blocks, please make sure your transaction was properly sent. Be aware that it might still be mined!
            // getWeb3().eth.getTransactionReceipt('0x92d97528abcb57430d2b278003d9719d36a7907ffb6a428fc17a9308b73c02fa', (answer) => { console.log(answer) })
            /*
              Catch 50 blocks
              blockHash
                : 
                "0x8d9dbe90c0c1e5890b992f45e3cc77b4941a0652b25e6f98079c2571dd324aee"
                blockNumber
                : 
                8503189
                contractAddress
                : 
                null
                cumulativeGasUsed
                : 
                7206805
                effectiveGasPrice
                : 
                4530168333
                events
                : 
                {Transfer: {…}, Mint: {…}}
                from
                : 
                "0x2a8d166495c7f854c5f2510fbd250fdab8ce58d7"
                gasUsed
                : 
                137713
                logsBloom
                : 
                "0x00000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000001000040000000020000000000000000000000800000000000008000000000000000000000000000000000200000000000000020000000000000000000800000000000000000000000010000000000000008000000000010000000000000004000000000000000000000000800000004000000000000000000000000000000000000000000000000000000000000000000102000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000"
                status
                : 
                true
                to
                : 
                "0x01ece09740185c4255ee1afcb3b030668f55a869"
                transactionHash
                : 
                "0xce4bcde994f15804d422a3d3a305870c1c4bb8009018afc6d746a9f1a315e54d"
                transactionIndex
                : 
                23
                type
                : 
                "0x2"
            */
            console.log('transaction error:', error)
            
            onError(error)
            reject(error)
          })
          .on('receipt', (receipt) => {
            console.log('transaction receipt:', receipt)
            onSuccess(receipt)
          })
          .then((res) => {
            resolve(res)
            onFinally(res)
          })
      } else {
        reject('NO_ACTIVE_ACCOUNT')
      }
    }).catch((err) => {
      console.log('>>> callNftMethod', err)
      reject(err)
    })
  })
        
}


export default callNftMethod