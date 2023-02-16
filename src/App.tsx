import React, { useState, useEffect } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { View, ScreenSpinner, AdaptivityProvider, AppRoot, ConfigProvider, SplitLayout, SplitCol } from '@vkontakte/vkui';
import {
  Panel, PanelHeader, Header, Button, Group, Cell, Div, Avatar, FormLayout, Input, FormItem,
  Textarea,
  File,
  Image,
  PanelHeaderBack 
} from '@vkontakte/vkui';

import {
  Icon24Camera,
  Icon28Search
} from '@vkontakte/icons'
import '@vkontakte/vkui/dist/vkui.css'

import { setupWeb3, switchOrAddChain, doConnectWithMetamask, isMetamaskConnected, onWalletChanged } from "./helpers/setupWeb3"


const App = () => {
	const [activePanel, setActivePanel] = useState('connectWallet');
	const [fetchedUser, setUser] = useState(null);
	const [popout, setPopout] = useState(<ScreenSpinner size='large' />);

  const chainId = process.env.REACT_APP_CHAIN_ID
  const [activeChainId, setActiveChainId] = useState(false)
  const [activeWeb3, setActiveWeb3] = useState(false)
  const [activeAddress, setActiveAddress] = useState(false)
  const [isWalletConecting, setIsWalletConnecting] = useState(false)

  const initOnWeb3Ready = async () => {
    if (activeWeb3 && (`${activeChainId}` == `${chainId}`)) {
      activeWeb3.eth.getAccounts().then((accounts) => {
        setActiveAddress(accounts[0])
        /*
        const _airdropContract = new activeWeb3.eth.Contract(NftAirdropContractData.abi, nftDropContractAddress)
        setAirdropContract(_airdropContract)
        fetchNftInfo(nftDropContractAddress, chainId).then((_nftInfo) => {
          console.log('>>> nft info fetched', _nftInfo)
          setNftInfo(_nftInfo)
          setNftInfoFetched(true)
        }).catch((err) => {
          console.log('>>> fail fetch nft info', err)
        })
        */
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
      /*
			const user = await bridge.send('VKWebAppGetUserInfo');
			setUser(user);
      */
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

  const goTo = (panelId) => {
    setActivePanel(panelId)
  }
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
                  <Group>
                    <FormLayout>
                      <FormItem
                        top="Изображение (JPG, PNG, SVG, GIF)"
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
                        <Div>
                          <Image
                            size={96}
                            src={nftImageData}
                            onClick={() => { goTo('imagePreview') }}
                          >
                            <Image.Overlay>
                              <Icon28Search />
                            </Image.Overlay>
                          </Image>
                        </Div>
                      )}
                      <FormItem
                        top="Название токена"
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
                        <Button size="l" stretched>
                          Создать NFT
                        </Button>
                      </FormItem>
                      
                    </FormLayout>
                  </Group>
                </Panel>
                <Panel id='imagePreview'>
                  <PanelHeader
                    before={<PanelHeaderBack onClick={() => { goTo('mintNFT') }} />}
                  >
                    Просмотр изображения
                  </PanelHeader>
                  <Div>
                    <style jsx>
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
