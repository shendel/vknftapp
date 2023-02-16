import Web3 from 'web3'
import { AVAILABLE_NETWORKS_INFO } from './constants'
import Web3Connect from '../web3connect'
import SUPPORTED_PROVIDERS from '../web3connect/providers/supported'
import { CHAIN_INFO } from './constants'

let web3connect = null

const switchOrAddChain = (neededChainId) => {
  const {
    chainId,
    chainName,
    rpcUrls,
    blockExplorerUrls,
    nativeCurrency,
  } = getChainInfoById(neededChainId)

  return new Promise(async (resolve, reject) => {
    const params = [
      {
        chainId,
        chainName,
        rpcUrls,
        blockExplorerUrls,
        nativeCurrency,
      }
    ]

    try {
      const isSwitch = await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${Number(chainId).toString(16)}` }],
      });
      if (isSwitch == false) {
        resolve(false)
      } else {
        resolve(true)
      }
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          const isAdd = await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params,
          });
          resolve(true)
        } catch (addError) {
          // handle "add" error
        }
      } else {
        console.error('Switch chain error: ', switchError.message)
        resolve(false)
      }
    }
  })
}

const getChainInfoById = (chainId: string) => AVAILABLE_NETWORKS_INFO.find(networkInfo => `${networkInfo.networkVersion}` === `${chainId}`)

const getCurrentChainId = (needChainId) => {
  const curChainId = window.ethereum && window.ethereum.networkVersion
  if (needChainId !== undefined) {
    return `${curChainId}` === `${needChainId}`
  } else return curChainId
}

const setupWeb3 = () => new Promise((resolve, reject) => {
  if (web3connect) {
    console.log('>>> setupWeb3', web3connect)
  }
})
  
const setupWeb3_ = () => new Promise((resolve, reject) => {
  if (window.ethereum) {
    // @ts-ignore
    const activeChainId = window.ethereum && window.ethereum.networkVersion
    const activeNetworkExists = AVAILABLE_NETWORKS_INFO.filter((netInfo) => {
      return netInfo.networkVersion == activeChainId
    })

    if (activeNetworkExists.length) {
      const activeNetwork = activeNetworkExists[0]

      // @ts-ignore
      const web3 = new Web3(window.ethereum || Web3.givenProvider || new Web3.providers.HttpProvider(activeNetwork.rpcUrls))

      if (web3) {
        resolve({
          activeChainId,
          web3
        })
      } else {
        reject('FAIL_SETUP_WEB3')
      }
    }
  } else {
    reject('NOT_INSTALLED')
  }
})

const isWalletConnected = () => web3connect?.isConnected()

const doDisconnectWallet = () => {
  return new Promise(async (resolved) => {
    if (isWalletConnected()) {
      await web3connect.Disconnect()
      resolved(true)
    } else {
      resolved(true)
    }
  })
}

const initWeb3Connector = async (options) => {
  const {
    onBeforeConnect,
    onConnected,
    onDisconnect,
    onError,
    onSetActiveChain,
    onSetActiveWeb3,
    onChainChange,
    onAccountChange,
    onReady,
    needChainId,
  } = options

  const _chainInfo = CHAIN_INFO(needChainId)

  const _web3connect = {
    web3ChainId: _chainInfo.networkVersion,
    web3RPC: {
      [_chainInfo.networkVersion]: _chainInfo.rpcUrls[0],
    },
  }

  web3connect = new Web3Connect(_web3connect)

  window.web3connect = web3connect
  
  web3connect.on('connected', () => {
    if (onBeforeConnect) onBeforeConnect()
    const activeChain = web3connect.getNetworksId()
    console.log('web3connect > on connected', activeChain)
    const activeChainId = activeChain.dicimalCachedId
    
    let _web3: EthereumProvider | false = false

    try {
      _web3 = web3connect.getWeb3()
    } catch (err) {
      web3connect.clearCache()
      return
    }
    
    if (onConnected) onConnected(activeChainId, _web3)
    if (onSetActiveChain) onSetActiveChain(activeChainId)
  })

  web3connect.on('disconnect', () => {
    console.log('>>> handleDisconnected')
    if (onDisconnect) onDisconnect()
  })
  
  web3connect.on('accountChange', () => {
    console.log('>>> handleAccountChanged')
  })
  
  web3connect.on('chainChanged', () => {
    console.log('>>> handleChainChanged')
    const activeChain = web3connect.getNetworksId()
    const activeChainId = activeChain.dicimalCachedId
    if (onChainChange) onChainChange(activeChain.dicimalCachedId)
  })
  
  await web3connect.onInit(async () => {
    if (web3connect.hasCachedProvider()) {
      const activeChain = web3connect.getNetworksId()
      const activeChainId = activeChain.dicimalCachedId

      if (onSetActiveChain) onSetActiveChain(activeChainId)

      let _web3: EthereumProvider | false = false

      try {
        _web3 = web3connect.getWeb3()
      } catch (err) {
        web3connect.clearCache()
        return
      }

      if (onConnected) onConnected(activeChainId, _web3)
    }
    if (onReady) onReady()
  })
}

const connectToProvider = (provider) => {
  web3connect.connectTo(provider)
}

const getWeb3 = () => {
  const _web3 = web3connect.getWeb3()
  return _web3
}


const isMetamaskConnected = () => {
  if (window && window.ethereum) {
    return new Promise((resolve, reject) => {
      ethereum.request({
        method: 'eth_accounts'
      }).then((accs) => {
        resolve(accs.length > 0)
      }).catch((err) => {
        resolve(false)
      })
    })
  } else return false
}

const onBlockchainChanged = (callback) => {
/*
  if (window && window.ethereum) {
    window.ethereum.on('networkChanged', callback)
  }
*/
}

const onWalletChanged = (callback) => {
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        callback(accounts[0])
      } else {
        callback(false)
      }
    })
  }
}

const getConnectedAddress = () => {
/*
  if (window && window.ethereum) {
    return new Promise((resolve, reject) => {
      ethereum.request({
        method: 'eth_accounts'
      }).then((accs) => {
        if (accs.length > 0) {
          resolve(accs[0])
        } else {
          resolve(false)
        }
      }).catch((err) => {
        resolve(false)
      })
    })
  } else return false
  */
}

export {
  switchOrAddChain,
  onBlockchainChanged,
  initWeb3Connector,
  doDisconnectWallet,
  setupWeb3,
  isMetamaskConnected,
  getConnectedAddress,
  getCurrentChainId,
  onWalletChanged,
  connectToProvider,
  isWalletConnected
}

export default setupWeb3
