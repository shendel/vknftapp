import React, { useState, useEffect } from 'react'
import bridge from '@vkontakte/vk-bridge'
import { View, ScreenSpinner, AdaptivityProvider, AppRoot, ConfigProvider, SplitLayout, SplitCol } from '@vkontakte/vkui'
import {
  Panel, PanelHeader, Header, Button, Group, Cell, Div, Avatar, FormLayout, Input, FormItem,
  Textarea,
  File,
  Image,
  PanelHeaderBack,
  Progress,
  FormStatus,
  SimpleCell,
  IconButton,
  CellButton,
  Alert
} from '@vkontakte/vkui'

import {
  Icon24Camera,
  Icon28Search,
  Icon28Users,
  Icon24ArrowRightOutline,
  Icon24Chevron,
  Icon20CopyOutline,
  Icon28DeleteOutline
} from '@vkontakte/icons'
import '@vkontakte/vkui/dist/vkui.css'

import { setupWeb3,
  connectToProvider,
  isWalletConnected,
  switchOrAddChain, initWeb3Connector, isMetamaskConnected, onWalletChanged, doDisconnectWallet
} from "./helpers/setupWeb3"

import { infuraUpload as IpfsUpload } from "./helpers/ipfs/infuraUpload"
import NftAirdropContractData from "./helpers/StakeNFT.json"
import { CHAIN_INFO } from "./helpers/constants"
import { toWei, fromWei } from "./helpers/wei"
import callNftMethod from "./helpers/callNftMethod"
import fetchNFTInfo from "./helpers/fetchNFTInfo"

const App = () => {

	const [activePanel, setActivePanel] = useState('loading');
	const [fetchedUser, setUser] = useState(null);
	const [popout, setPopout] = useState(<ScreenSpinner size='large' state="loading" />)
  
  const clearPopout = () => { setPopout(null) }

  const chainId = process.env.REACT_APP_CHAIN_ID
  const mintChainInfo = CHAIN_INFO(chainId)
  const nftDropContractAddress = process.env.REACT_APP_CONTRACT_ADDRESS
  
  const [activeChainId, setActiveChainId] = useState(false)
  const [activeWeb3, setActiveWeb3] = useState(false)
  const [activeAddress, setActiveAddress] = useState(false)
  const [accountBalance, setAccountBalance ] = useState(0)
  const [accountBalanceFetching, setAccountBalanceFetching ] = useState(true)
  const [isWalletConecting, setIsWalletConnecting] = useState(false)

  const [ nftInfo, setNftInfo ] = useState({})
  const [ nftInfoFetched, setNftInfoFetched ] = useState(false)

  const [ isLoaded, setIsLoaded ] = useState(false)

  useEffect(() => {
    if (isLoaded) clearPopout()
  }, [ isLoaded ])

  useEffect(() => {
    if (isLoaded) {
      if (isWalletConnected()) {
        if (`${activeChainId}` !== `${chainId}`) {
          setActivePanel(`switchNetwork`)
        } else {
          setActivePanel(`mintNFT`)
        }
      } else {
        setActivePanel(`connectWallet`)
      }
    }
  }, [ activeChainId, isLoaded, activeAddress ])
  
  const initOnWeb3Ready = async () => {
    console.log('>>> initOnWeb3Ready', activeWeb3, `${activeChainId}`, `${chainId}`)
    if (activeWeb3 && (`${activeChainId}` == `${chainId}`)) {
    
      activeWeb3.eth.getAccounts().then((accounts) => {
        setActiveAddress(accounts[0])
        console.log('>>> setActiveAddress', accounts)
        
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
    }
  }

  useEffect(() => {
    if (activeAddress && activeWeb3 && (`${activeChainId}` == `${chainId}`)) {
      setAccountBalanceFetching(true)
      activeWeb3.eth.getBalance(activeAddress).then((balanceWei) => {
        setAccountBalance(balanceWei)
        setAccountBalanceFetching(false)
      })
    }
  }, [activeAddress, activeChainId, isLoaded])

  const handleSwitchNetwork = () => {
    switchOrAddChain(chainId)
  }
  
  const handleDisconnectWallet = () => {
    setPopout(
      <Alert
        actions={[
          {
            title: 'Отвязать кошелек',
            mode: 'destructive',
            autoClose: true,
            action: () => {
              console.log('>>> do disconnect wallet')
              doDisconnectWallet()
              setActiveAddress(false)
            }
          },
          {
            title: 'Отмена',
            autoClose: true,
            mode: 'cancel',
          },
        ]}
        actionsLayout="vertical"
        onClose={clearPopout}
        header="Подтвердите действие"
        text="Вы действительно хотите отвязать кошелек?"
      />,
    )
  }

  const [ web3Inited, setWeb3Inited ] = useState(false)

  useEffect(() => {
    initOnWeb3Ready()
  }, [activeChainId, activeWeb3])

  useEffect(() => {
    if (!web3Inited) {
      initWeb3Connector({
        onBeforeConnect: () => { setIsWalletConnecting(true) },
        onSetActiveChain: (cId) => {
          setActiveChainId(cId)
        },
        onConnected: (cId, web3) => {
          setActiveWeb3(web3)
          setIsWalletConnecting(false)
        },
        onDisconnect: () => {
          setActiveWeb3(false)
          setActiveChainId(false)
          setActiveAddress(false)
        },
        onError: (err) => {
          setIsWalletConnecting(false)
        },
        onChainChange: (newChainId) => {
          setActiveChainId(newChainId)
        },
        onReady: () => {
          setIsLoaded(true)
        },
        needChainId: chainId,
      })
      setWeb3Inited(true)
    }
  }, [ web3Inited ])

  const connectWithMetamask = async () => {
    connectToProvider('INJECTED')
  }

  onWalletChanged((newAccount) => {
    setActiveAddress(newAccount)
  })



  const copyWalletAddress = () => {
    const textField = document.createElement('textarea')
    textField.innerText = activeAddress
    document.body.appendChild(textField)
    textField.select()
    document.execCommand('copy')
    textField.remove()
  }

	useEffect(() => {
		async function fetchData() {
      if (document.location.hostname !== 'localhost') {
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
      }
			//setPopout(null);
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
  const [ txMintError, setTxMintError ] = useState(false)
  
  const resetMintForm = () => {
    setIsMintShow(false)
    setTxMintError(false)
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
    setPopout(
      <Alert
        actions={[
          {
            title: 'Создать NFT',
            mode: 'default',
            autoClose: true,
            action: () => {
              _doMintNFT()
            }
          },
          {
            title: 'Отмена',
            autoClose: true,
            mode: 'cancel',
          },
        ]}
        actionsLayout="vertical"
        onClose={clearPopout}
        header="Подтвердите действие"
        text="Создать NFT-токен?"
      />,
    );
  }
  
  const _doMintNFT = () => {
    
    setIsMinting(false)
    setMintTx(false)
    setTxMintError(false)
    
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
            setTxMintError(true)
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
                txHash: mintTx,
              })
            }
            setIsMinting(false)
            setIsMinted(true)
            setMintStep(6)
            setPopout(<ScreenSpinner state="done" aria-label="Успешно" />)
            setTimeout(() => {
              setActivePanel('mintedNft')
              clearPopout()
              resetMintForm()
            }, 2000)
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
                <Panel id='loading'>
                  <PanelHeader>Создание NFT токена</PanelHeader>
                </Panel>
                <Panel id='switchNetwork'>
                  <PanelHeader>Нужно сменить активную сеть</PanelHeader>
                  <Div>
                    <Button onClick={handleSwitchNetwork}>Сменить сеть</Button>
                  </Div>
                </Panel>
                <Panel id='connectWallet'>
                  <PanelHeader>Подключение крипто-кошелька</PanelHeader>
                  <Div>
                    <Button onClick={connectWithMetamask}>
                      {isWalletConecting
                        ? `Подключаем крипто-кошелек...`
                        : `Подключить Metamask`
                      }
                    </Button>
                  </Div>
                </Panel>
                <Panel id='mintNFT'>
                  <PanelHeader>Создание NFT токена</PanelHeader>
                  {!isMintShow && (
                    <Group>
                      <SimpleCell
                        onClick={() => { if (activeAddress) goTo('walletInfo') }}
                        before={<Avatar size={48} fallbackIcon={<Icon28Users />} src="#" />}
                        subtitle={accountBalanceFetching
                          ? `Загрузка баланса`
                          : `Баналс: ${fromWei(accountBalance, mintChainInfo.nativeCurrency.decimals)} ${mintChainInfo.nativeCurrency.symbol}`
                        }
                        after={<Icon24Chevron />}
                      >
                        {`Кошелек: ${(activeAddress) ? activeAddress : 'Загрузка...'}`}
                      </SimpleCell>
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
                        {mintError && (
                          <FormStatus header="При создании NFT произошла ошибка" mode="error">
                            {isImageUploadError && (`Не удалось загрузить изображение в IPFS`)}
                            {isJsonUploadError && (`Не удалось загрузить метаданые в IPFS`)}
                            {txMintError && (`Произошла ошибка при создании транзкции`)}
                          </FormStatus>
                        )}
                        <FormItem top={`Создание NFT: ${MintSteps[mintStep].title}`}>
                          <Progress aria-labelledby="progresslabel" value={MintSteps[mintStep].progress} />
                        </FormItem>
                        {mintError && (
                          <FormItem>
                            <Button size="l" stretched onClick={resetMintForm}>
                              Вернуться назад
                            </Button>
                          </FormItem>
                        )}
                      </FormLayout>
                    </Group>
                  )}
                </Panel>
                <Panel id='mintedNft'>
                  <PanelHeader
                    before={<PanelHeaderBack onClick={() => { goTo('mintNFT') }} />}
                  >
                    Информация о созданной NFT
                  </PanelHeader>
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
                <Panel id='walletInfo'>
                  <PanelHeader
                    before={<PanelHeaderBack onClick={() => { goTo('mintNFT') }} />}
                  >
                    Информация о крипто-кошельке
                  </PanelHeader>
                  <Group>
                    <FormLayout>
                      <FormItem
                        top="Адрес"
                      >
                        <Input
                          value={activeAddress}
                          readOnly={true}
                          after={(
                            <IconButton onClick={copyWalletAddress}>
                              <Icon20CopyOutline />
                            </IconButton>
                          )}
                        />
                      </FormItem>
                      <FormItem>
                        <CellButton before={<Icon28DeleteOutline />} mode="danger" onClick={handleDisconnectWallet}>
                          Отвязать кошелек
                        </CellButton>
                      </FormItem>
                    </FormLayout>
                  </Group>
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
