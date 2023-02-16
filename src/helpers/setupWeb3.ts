import Web3 from 'web3'
import { AVAILABLE_NETWORKS_INFO } from './constants'

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

const doConnectWithMetamask = async (options) => {
  const {
    onBeforeConnect,
    onConnected,
    onError,
    onSetActiveChain,
    onSetActiveWeb3,
    needChainId,
  } = options

  if (onBeforeConnect) onBeforeConnect()
  
  try {
    await window.ethereum.enable()
    setupWeb3().then(async (answer) => {
      const {
        activeChainId, web3
      } = answer
      if (onSetActiveChain) onSetActiveChain(activeChainId)

      if (`${activeChainId}` === `${needChainId}`) {
        if (onSetActiveWeb3) onSetActiveWeb3(web3)
        if (onConnected) onConnected(activeChainId, web3)
      } else {
        
        const _onSwitch = () => {
          console.log('>>> after switch', needChainId)
          setupWeb3().then(async (afterSwitch) => {
            console.log('>>> afterSwitch', afterSwitch)
            if (`${afterSwitch.activeChainId}` === `${needChainId}`) {
              await doConnectWithMetamask(options)
            }
          })
        }
        window.ethereum.once('networkChanged', _onSwitch)
        try {
          const isSwitched = await switchOrAddChain(needChainId)
          console.log('>>> isSwitched', isSwitched)
          if (isSwitched === false) {
            if (onError) onError({ message: 'REJECT_SWITCH_NETWORK' })
            return
          }
        } catch (err) {
          if (onError) onError(err)
        }
        setTimeout(() => {
          //_onSwitch()
        }, 1000)
      }
    }).catch((err) => {
      if (onError) onError(err)
    })
  } catch (err) {
    if (onError) onError(err)
  }
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
  if (window && window.ethereum) {
    window.ethereum.on('networkChanged', callback)
  }
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
}

export {
  switchOrAddChain,
  onBlockchainChanged,
  doConnectWithMetamask,
  setupWeb3,
  isMetamaskConnected,
  getConnectedAddress,
  getCurrentChainId,
  onWalletChanged,
}

export default setupWeb3
