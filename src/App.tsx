import React, { useState, useEffect } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { View, ScreenSpinner, AdaptivityProvider, AppRoot, ConfigProvider, SplitLayout, SplitCol } from '@vkontakte/vkui';
import {
  Panel, PanelHeader, Header, Button, Group, Cell, Div, Avatar, FormLayout, Input, FormItem,
  Textarea,
  File,
  Image,
  PanelHeaderBack,
  Progress
} from '@vkontakte/vkui';

import {
  Icon24Camera,
  Icon28Search
} from '@vkontakte/icons'
import '@vkontakte/vkui/dist/vkui.css'

import { setupWeb3, switchOrAddChain, doConnectWithMetamask, isMetamaskConnected, onWalletChanged } from "./helpers/setupWeb3"

import { infuraUpload as IpfsUpload } from "./helpers/ipfs/infuraUpload"
import NftAirdropContractData from "./helpers/StakeNFT.json"
import { CHAIN_INFO } from "./helpers/constants"
import { toWei, fromWei } from "./helpers/wei"
import callNftMethod from "./helpers/callNftMethod"
import fetchNFTInfo from "./helpers/fetchNFTInfo"

const App = () => {
	const [activePanel, setActivePanel] = useState('connectWallet');
	const [fetchedUser, setUser] = useState(null);
	const [popout, setPopout] = useState(<ScreenSpinner size='large' />)
  
  const clearPopout = () => { setPopout(null) }

  const chainId = process.env.REACT_APP_CHAIN_ID
  const nftDropContractAddress = process.env.REACT_APP_CONTRACT_ADDRESS
  
  const [activeChainId, setActiveChainId] = useState(false)
  const [activeWeb3, setActiveWeb3] = useState(false)
  const [activeAddress, setActiveAddress] = useState(false)
  const [isWalletConecting, setIsWalletConnecting] = useState(false)

  const [ nftInfo, setNftInfo ] = useState({})
  const [ nftInfoFetched, setNftInfoFetched ] = useState(false)
  
  const initOnWeb3Ready = async () => {
    if (activeWeb3 && (`${activeChainId}` == `${chainId}`)) {
      activeWeb3.eth.getAccounts().then((accounts) => {
        setActiveAddress(accounts[0])
        fetchNFTInfo(nftDropContractAddress, chainId).then((_nftInfo) => {
          console.log('>>> nft info fetched', _nftInfo)
          setNftInfo(_nftInfo)
          setNftInfoFetched(true)
        }).catch((err) => {
          console.log('>>> fail fetch nft info', err)
        })
      }).catch((err) => {
        setActiveAddress(false)
        console.log('>>> initOnWeb3Ready', err)
      })
    } else {
      const _isConnected = await isMetamaskConnected()
      if (_isConnected) {
        connectWithMetamask()
      } else {
        setActiveAddress(false)
      }
    }
  }
  
  const connectWithMetamask = async () => {
    doConnectWithMetamask({
      onBeforeConnect: () => { setIsWalletConnecting(true) },
      onSetActiveChain: setActiveChainId,
      onConnected: (cId, web3) => {
        setActiveWeb3(web3)
        setIsWalletConnecting(false)
      },
      onError: (err) => {
        setIsWalletConnecting(false)
      },
      needChainId: chainId,
    })
  }

  onWalletChanged((newAccount) => {
    setActiveAddress(newAccount)
    if (newAccount) {
      initOnWeb3Ready()
    }
  })
  
  useEffect(() => {
    initOnWeb3Ready()
  }, [activeWeb3])
  
  useEffect(() => {
    if (activeAddress) {
      setActivePanel('mintNFT')
    } else {
      setActivePanel('connectWallet')
    }
  }, [activeAddress])


	useEffect(() => {
    console.log(process.env)
		async function fetchData() {
      if (document.location.hostname !== 'localhost') {
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
      }
			setPopout(null);
		}
		fetchData();
	}, []);

  const [ nftImage, setNftImage ] = useState(null)
  const [ nftImageData, setNftImageData ] = useState(null)
  const [ nftImageDataBuffer, setNftImageDataBuffer ] = useState(null)

  const [ nftName, setNftName ] = useState(``)
  const [ nftDesc, setNftDesc ] = useState(``)
  
  useEffect(() => {
    let fileReader, isCancel = false
    let fileReaderBuffer, isCancelBuffer = false
    console.log('>>> nftImage', nftImage)
    if (nftImage) {
      fileReader = new FileReader()
      fileReader.onload = (e) => {
        const { result } = e.target
        if (result && !isCancel) {
          setNftImageData(result)
        }
      }
      fileReader.readAsDataURL(nftImage)
      
      fileReaderBuffer = new FileReader()
      fileReaderBuffer.onload = (e) => {
        const { result } = e.target
        if (result && !isCancelBuffer) {
          setNftImageDataBuffer(result)
        }
      }
      fileReaderBuffer.readAsArrayBuffer(nftImage)
    }
    
    return () => {
      isCancel = true
      if (fileReader && fileReader.readyState === 1) {
        fileReader.abort()
      }
      isCancelBuffer = true
      if (fileReaderBuffer && fileReaderBuffer.readyState === 1) {
        fileReaderBuffer.abort()
      }
    }

  }, [nftImage])

  const MintSteps = {
    1: {
      title: `Загрузка изображения в IPFS`,
      progress: 10,
    },
    2: {
      title: `Загрузка метаданных в IPFS`,
      progress: 40,
    },
    3: {
      title: `Минт NFT. Подтвердите транзакцию`,
      progress: 60,
    },
    4: {
      title: `Минт NFT. Транзакция создана`,
      progress: 80,
    },
    5: {
      title: `Транзакция отправлена в блокчейн`,
      progress: 90,
    },
    6: {
      title: `Готово. NFT создана`,
      progress: 100
    }
  }

  const [ mintStep, setMintStep ] = useState(1)
  
  const [ isMinting, setIsMinting ] = useState(false)
  const [ isMinted, setIsMinted ] = useState(false)

  const [ isImageUpload, setIsImageUpload ] = useState(false)
  const [ isImageUploaded, setIsImageUploaded ] = useState(false)
  const [ isImageUploadError, setIsImageUploadError ] = useState(false)
  const [ imageUploadedCID, setImageUploadedCID ] = useState(false)
  
  const [ isJsonUpload, setIsJsonUpload ] = useState(false)
  const [ isJsonUploaded, setIsJsonUploaded ] = useState(false)
  const [ isJsonUploadError, setIsJsonUploadError ] = useState(false)
  const [ jsonUploadedCID, setJsonUploadedCID ] = useState(false)

  const [ mintTx, setMintTx ] = useState(false)
  const [ isMintShow, setIsMintShow ] = useState(false)
  
  const [ mintedNFT, setMintedNft ] = useState(false)
  const [ mintError, setMintError ] = useState(false)
  
  const resetMintForm = () => {
    setIsMintShow(false)
    setIsImageUploaded(false)
    setMintError(false)
    setIsJsonUploaded(false)
    setNftName(``)
    setNftDesc(``)
    setNftImage(null)
    setNftImageData(null)
    setNftImageDataBuffer(null)
  }
  
  const doMintNFT = () => {
    if (nftName === ``) return
    if (nftImageDataBuffer === null) return
    
    setIsMinting(false)
    setMintTx(false)
    
    setIsImageUpload(true)
    setIsImageUploadError(false)
    setIsImageUploaded(false)
    
    setIsJsonUpload(false)
    setIsJsonUploaded(false)
    setIsJsonUploadError(false)
    
    setIsMintShow(true)

    setPopout(<ScreenSpinner state="loading" />)

    setMintStep(1)

    IpfsUpload(nftImageDataBuffer).then((imageCid) => {
      console.log('>>> cid', imageCid)
      setImageUploadedCID(imageCid)
      const json = {
        name: nftName,
        description: nftDesc,
        image: `ipfs://${imageCid}`,
      }
      setIsImageUpload(false)
      setIsImageUploaded(true)
      setIsJsonUpload(true)
      setMintStep(2)
      IpfsUpload(JSON.stringify(json)).then((jsonCID) => {
        setIsJsonUpload(false)
        setIsJsonUploaded(true)
        setJsonUploadedCID(jsonCID)
        console.log('>>> json CID', jsonCID)
        setIsMinting(true)
        setMintStep(3)
        callNftMethod({
          activeWeb3,
          contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS,
          method: 'mint',
          weiAmount: nftInfo.NFTStakeInfo.mintOwnPrice,
          args: [
            activeAddress,
            `ipfs://${jsonCID}`
          ],
          onSuccess: () => {
            console.log('>>> onSuccess')
            setMintStep(4)
          },
          onTrx: (txHash) => {
            console.log('>> onTrx', txHash)
            setMintStep(5)
            setMintTx(txHash)
          },
          onError: (err) => {
            console.log('>> onError', err)
            setMintError(true)
            setPopout(<ScreenSpinner state="error" aria-label="Произошла ошибка" />)
            setTimeout(clearPopout, 1000)
          },
          onFinally: (answer) => {
            console.log('>> onFinally', answer)
            if (
              answer?.events?.Mint?.returnValues?.tokenUri
              && answer?.events?.Mint?.returnValues?.tokenId
            ) {
              const {
                tokenId,
                tokenUri,
              } = answer.events.Mint.returnValues

              setMintedNft({
                tokenId,
                tokenUri,
              })
            }
            setIsMinting(false)
            setIsMinted(true)
            setMintStep(6)
            setPopout(<ScreenSpinner state="done" aria-label="Успешно" />)
            setTimeout(clearPopout, 1000)
          }
        })
      }).catch((err) => {
        console.log('err', err)
        setIsJsonUpload(false)
        setIsJsonUploadError(true)
        setIsMinting(false)
        setMintError(true)
        setPopout(<ScreenSpinner state="error" aria-label="Произошла ошибка" />)
        setTimeout(clearPopout, 1000)
      })
    }).catch((err) => {
      console.log('>>> err', err)
      setIsImageUploadError(true)
      setIsImageUpload(false)
      setIsMinting(false)
      setMintError(true)
      setPopout(<ScreenSpinner state="error" aria-label="Произошла ошибка" />)
      setTimeout(clearPopout, 1000)
    })
  }
  
  const goTo = (panelId) => {
    setActivePanel(panelId)
  }

  const mintDisabled = (nftName === ``) || (nftImageDataBuffer === null)

	return (
		<ConfigProvider>
			<AdaptivityProvider>
				<AppRoot>
					<SplitLayout popout={popout}>
						<SplitCol>
							<View activePanel={activePanel}>
                <Panel id='connectWallet'>
                  <PanelHeader>Подключение кошелька Metamask</PanelHeader>
                  <Div>
                    <Button onClick={connectWithMetamask}>
                      Подключить кошелек
                    </Button>
                  </Div>
                </Panel>
                <Panel id='mintNFT'>
                  <PanelHeader>Создание NFT токена</PanelHeader>
                  {!isMintShow && (
                    <Group>
                      <FormLayout>
                        <FormItem
                          top="Изображение (JPG, PNG, SVG, GIF)"
                          status={nftImageDataBuffer !== null ? 'valid' : 'error'}
                          bottom={
                            nftImageDataBuffer !== null ? null : `Укажите изображение`
                          }
                        >
                          <File 
                            before={<Icon24Camera role="presentation" />}
                            size="l"
                            onChange={(e) => { setNftImage(e.target.files[0]) }}
                            accept="image/*"
                          >
                            Открыть галерею
                          </File>
                        </FormItem>
                        {nftImageData && (
                          <FormItem
                            top="Выбранное изображение"
                          >
                            <Image
                              size={96}
                              src={nftImageData}
                              onClick={() => { goTo('imagePreview') }}
                            >
                              <Image.Overlay>
                                <Icon28Search />
                              </Image.Overlay>
                            </Image>
                          </FormItem>
                        )}
                        <FormItem
                          top="Название токена"
                          status={nftName !== `` ? 'valid' : 'error'}
                          bottom={
                            nftName !== `` ? null : `Укажите название NFT токена`
                          }
                        >
                          <Input
                            value={nftName}
                            onChange={(e) => { setNftName(e.target.value) }}
                          />
                        </FormItem>
                        <FormItem
                          top="Описание"
                        >
                          <Textarea 
                            value={nftDesc}
                            onChange={(e) => { setNftDesc(e.target.value) }}
                          />
                        </FormItem>
                        <FormItem>
                          <Button disabled={mintDisabled} size="l" stretched onClick={doMintNFT}>
                            Создать NFT
                          </Button>
                        </FormItem>
                      </FormLayout>
                    </Group>
                  )}
                  {isMintShow && (
                    <Group>
                      <FormLayout>
                        <FormItem top={`Создание NFT: ${MintSteps[mintStep].title}`}>
                          <Progress aria-labelledby="progresslabel" value={MintSteps[mintStep].progress} />
                        </FormItem>
                        {/*
                        <FormItem>
                          <Button size="l" loading="true" stretched>
                            Готово
                          </Button>
                        </FormItem>
                        */}
                      </FormLayout>
                    </Group>
                  )}
                </Panel>
                <Panel id='deployNft'>
                </Panel>
                <Panel id='imagePreview'>
                  <PanelHeader
                    before={<PanelHeaderBack onClick={() => { goTo('mintNFT') }} />}
                  >
                    Просмотр изображения
                  </PanelHeader>
                  <Div>
                    <style>
                    {`
                      .nftImagePreview {
                        display: block;
                        max-width: 480px;
                        width: 100%;
                        margin: 0 auto;
                        border-radius: 10px;
                      }
                    `}
                    </style>
                    {nftImageData && (
                      <img src={nftImageData} className="nftImagePreview" />
                    )}
                  </Div>
                </Panel>
                {/*
								<Home id='home' fetchedUser={fetchedUser} go={go} />
								<Persik id='persik' go={go} />
                */}
							</View>
						</SplitCol>
					</SplitLayout>
				</AppRoot>
			</AdaptivityProvider>
		</ConfigProvider>
	);
}

export default App;
