// @flow
import * as React from 'react'
import * as Constants from '../../../constants/login'
import {Image, Icon, Box2, Text, PlainInput, WaitingButton} from '../../../common-adapters'
import {
  platformStyles,
  collapseStyles,
  globalColors,
  globalMargins,
  globalStyles,
  isMobile,
  styleSheetCreate,
} from '../../../styles'
import QRImage from './qr-image'
import QRScan from './qr-scan'
import {iconMeta} from '../../../common-adapters/icon.constants'

const blueBackground = require('../../../images/illustrations/bg-provisioning-blue.png')
const greenBackground = require('../../../images/illustrations/bg-provisioning-green.png')

export type DeviceType = 'phone' | 'desktop'
export type Tab = 'QR' | 'enterText' | 'viewText'

type Props = {
  username: string,
  currentDeviceAlreadyProvisioned: boolean,
  currentDeviceType: DeviceType,
  currentDeviceName: string,
  otherDeviceName: string,
  otherDeviceType: DeviceType,
  // only in storybook
  tabOverride?: ?Tab,
  textCode: string,
  onSubmitTextCode: string => void,
}

type State = {
  tab: Tab,
}

class CodePage2 extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      tab: (__STORYBOOK__ && this.props.tabOverride) || this._defaultTab(this.props),
    }
  }

  componentDidUpdate(prevProps: Props) {
    const curDefault = this._defaultTab(this.props)
    const prevDefault = this._defaultTab(prevProps)
    if (curDefault !== prevDefault) {
      this.setState({tab: curDefault})
    }
  }

  static _validTabs = (currentDeviceType, otherDeviceType) => {
    if (currentDeviceType === 'desktop' && otherDeviceType === 'desktop') {
      return ['viewText', 'enterText']
    } else {
      return ['QR', 'viewText', 'enterText']
    }
  }

  _defaultTab = (props: Props) => {
    const oppositeTabMap = {
      QR: 'QR',
      enterText: 'viewText',
      viewText: 'enterText',
    }
    const getTabOrOpposite = tabToShowToNew =>
      props.currentDeviceAlreadyProvisioned ? oppositeTabMap[tabToShowToNew] : tabToShowToNew

    if (props.currentDeviceType === 'phone') {
      return getTabOrOpposite('QR')
    } else if (props.currentDeviceType === 'desktop') {
      return props.otherDeviceType === 'desktop' ? getTabOrOpposite('viewText') : getTabOrOpposite('QR')
    }

    throw new Error('Impossible defaultTab')
  }

  _tabBackground = () => (this.state.tab === 'QR' ? globalColors.blue2 : globalColors.green)

  render() {
    let content
    switch (this.state.tab) {
      case 'QR':
        content = <Qr {...this.props} />
        break
      case 'viewText':
        content = <ViewText {...this.props} />
        break
      case 'enterText':
        content = <EnterText {...this.props} />
        break
      default:
        /*::
      declare var ifFlowErrorsHereItsCauseYouDidntHandleAllTypesAbove: (action: empty) => any
      ifFlowErrorsHereItsCauseYouDidntHandleAllTypesAbove(this.state.tab);
      */
        content = null
    }

    return (
      <Box2
        direction="vertical"
        fullWidth={true}
        fullHeight={true}
        style={{backgroundColor: this._tabBackground()}}
      >
        <Image
          src={this.state.tab === 'QR' ? blueBackground : greenBackground}
          style={
            this.props.currentDeviceAlreadyProvisioned ? styles.backgroundOnLeft : styles.backgroundOnRight
          }
        />
        <Box2 direction="vertical" style={styles.container} fullWidth={true} fullHeight={true}>
          <Instructions {...this.props} />
          {content}

          <SwitchTab {...this.props} selected={this.state.tab} onSelect={tab => this.setState({tab})} />
        </Box2>
      </Box2>
    )
  }
}

const SwitchTab = (props: {selected: Tab, onSelect: Tab => void} & Props) => {
  if (props.currentDeviceType === 'desktop' && props.otherDeviceType === 'desktop') {
    return <Box2 direction="horizontal" />
  }

  let label
  let icon
  let tab

  if (props.selected === 'QR') {
    label = 'Type secret instead'
    icon = 'iconfont-arrow-right'
    if (props.currentDeviceType === 'phone' && props.otherDeviceType === 'phone') {
      tab = props.currentDeviceAlreadyProvisioned ? 'enterText' : 'viewText'
    } else if (props.currentDeviceType === 'phone') {
      tab = 'viewText'
    } else {
      tab = 'enterText'
    }
  } else {
    label = 'Scan QR instead'
    icon = 'iconfont-arrow-left'
    tab = 'QR'
  }

  return (
    <Box2 direction="horizontal" gap="xtiny" style={styles.switchTabContainer}>
      <Icon type={icon} color={globalColors.white} />
      <Text type="Header" onClick={() => props.onSelect(tab)} style={styles.switchTab}>
        {label}
      </Text>
    </Box2>
  )
}

const Qr = (props: Props) =>
  props.currentDeviceType === 'desktop' ? (
    <Box2 direction="vertical" style={styles.qrOnlyContainer}>
      <QRImage code={props.textCode} cellSize={5} />
    </Box2>
  ) : (
    <Box2
      style={collapseStyles([
        styles.qrContainer,
        props.currentDeviceAlreadyProvisioned && styles.qrContainerFlip,
      ])}
      direction="vertical"
    >
      <Box2 direction="vertical" style={styles.qrImageContainer}>
        <QRImage code={props.textCode} />
      </Box2>
      <QRScan onScan={props.onSubmitTextCode} />
    </Box2>
  )

class EnterText extends React.Component<Props, {code: string}> {
  state = {code: ''}

  _submit = () => {
    this.props.onSubmitTextCode(this.state.code)
  }

  render() {
    return (
      <Box2 direction="vertical" style={styles.enterTextContainer} gap="small">
        <PlainInput
          multiline={true}
          onChangeText={code => this.setState({code})}
          onEnterKeyDown={this._submit}
          rowsMin={3}
          placeholder={`Type the ${this.props.otherDeviceType === 'phone' ? '9' : '8'}-word secret code`}
          textType="Terminal"
          style={styles.enterTextInput}
          value={this.state.code}
        />
        <WaitingButton
          fullWidth={true}
          type="PrimaryColoredBackground"
          backgroundMode="Green"
          label="Submit"
          onClick={this._submit}
          style={styles.enterTextButton}
          waitingKey={Constants.waitingKey}
        />
      </Box2>
    )
  }
}

const ViewText = (props: Props) => (
  <Box2 direction="vertical" style={styles.viewTextContainer}>
    <Text type="Terminal" style={styles.viewTextCode}>
      {props.textCode}
    </Text>
  </Box2>
)

const Instructions = (p: Props) => (
  <Box2 direction="vertical">
    {p.currentDeviceAlreadyProvisioned ? (
      <React.Fragment>
        <Text type="Header" style={styles.instructions}>
          Ready to provision using
        </Text>
        <Text type="Header" style={styles.instructionsItalic}>
          {p.otherDeviceName}.
        </Text>
      </React.Fragment>
    ) : (
      <React.Fragment>
        <Text type="Header" style={styles.instructions}>
          In
          <Text type="Header" style={styles.instructionsItalic}>
            {' '}
            {p.otherDeviceName}
          </Text>
          , go to
        </Text>
        <Text type="Header" style={styles.instructions}>
          Devices
          <Text type="Header" style={styles.instructionsCarets}>
            {` ${String.fromCharCode(iconMeta['iconfont-arrow-right'].charCode || 0)} `}
          </Text>
          <Text type="Header" style={styles.instructions}>
            Add new
          </Text>
          <Text type="Header" style={styles.instructionsCarets}>
            {` ${String.fromCharCode(iconMeta['iconfont-arrow-right'].charCode || 0)} `}
          </Text>
          <Text type="Header" style={styles.instructions}>
            New {p.currentDeviceType === 'desktop' ? 'computer' : 'phone'}.
          </Text>
        </Text>
      </React.Fragment>
    )}
  </Box2>
)

const styles = styleSheetCreate({
  backgroundOnLeft: {
    ...globalStyles.fillAbsolute,
    bottom: 0,
    left: -230,
    marginBottom: 'auto',
    marginTop: 'auto',
    right: undefined,
    top: 0,
  },
  backgroundOnRight: {
    ...globalStyles.fillAbsolute,
    bottom: 0,
    left: undefined,
    marginBottom: 'auto',
    marginTop: 'auto',
    right: -230,
    top: 0,
  },
  container: platformStyles({
    common: {
      justifyContent: 'space-between',
      padding: globalMargins.large,
    },
    isElectron: {
      // else the background can go above things, annoyingly
      zIndex: 1,
    },
  }),
  enterTextButton: {
    maxWidth: isMobile ? 300 : 460,
    width: '100%',
  },
  enterTextContainer: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  enterTextInput: {
    ...globalStyles.fontTerminalSemibold,
    backgroundColor: globalColors.white,
    borderRadius: 4,
    color: globalColors.green2,
    fontSize: 16,
    maxWidth: isMobile ? 300 : 460,
    paddingBottom: 15,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 15,
  },
  instructions: {
    color: globalColors.white,
    textAlign: 'center',
  },
  instructionsCarets: platformStyles({
    common: {
      color: globalColors.white,
      fontFamily: 'kb',
      fontStyle: 'normal',
      fontWeight: 'normal',
      textAlign: 'center',
    },
    isElectron: {
      WebkitFontSmoothing: 'antialiased',
      fontVariant: 'normal',
      speak: 'none',
      textTransform: 'none',
    },
  }),
  instructionsContainer: {
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  instructionsItalic: {
    ...globalStyles.italic,
    color: globalColors.white,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: globalColors.white,
    borderRadius: 8,
    flexDirection: 'column',
    padding: 4,
    width: 220,
  },
  qrContainerFlip: {
    flexDirection: 'column-reverse',
  },
  qrImageContainer: {
    paddingBottom: 30,
    paddingTop: 30,
  },
  qrOnlyContainer: {
    backgroundColor: globalColors.white,
    borderRadius: 8,
    padding: 20,
  },
  switchTab: {
    color: globalColors.white,
  },
  switchTabContainer: {
    alignItems: 'center',
  },
  viewTextCode: {
    ...globalStyles.fontTerminalSemibold,
    color: globalColors.white,
    fontSize: 16,
    maxWidth: isMobile ? 200 : 330,
    textAlign: 'center',
  },
  viewTextContainer: {
    backgroundColor: globalColors.green2,
    borderRadius: 4,
    maxWidth: isMobile ? 300 : 460,
    paddingBottom: 20,
    paddingLeft: 64,
    paddingRight: 64,
    paddingTop: 20,
  },
})
export default CodePage2
