// @flow
import * as I from 'immutable'
import * as Chat2Gen from '../../../actions/chat2-gen'
import * as Constants from '../../../constants/chat2'
import * as TeamConstants from '../../../constants/teams'
import * as React from 'react'
import * as RouteTreeGen from '../../../actions/route-tree-gen'
import * as Types from '../../../constants/types/chat2'
import {InfoPanel} from '.'
import {connect, getRouteProps, isMobile, type RouteProps} from '../../../util/container'
import {createShowUserProfile} from '../../../actions/profile-gen'
import {Box} from '../../../common-adapters'
import * as RPCChatTypes from '../../../constants/types/rpc-chat-gen'

type OwnProps = {|
  conversationIDKey: Types.ConversationIDKey,
  onBack?: () => void,
  onCancel?: () => void,
  onSelectTab: string => void,
  selectedTab: ?string,
  onSelectAttachmentView: RPCChatTypes.GalleryItemTyp => void,
  selectedAttachmentView: RPCChatTypes.GalleryItemTyp,
|}

const getFromMsgID = info => {
  if (info.last || info.status !== 'success') {
    return null
  }
  return info.messages.size > 0 ? info.messages.last().id : null
}

const mapStateToProps = (state, ownProps: OwnProps) => {
  const conversationIDKey = ownProps.conversationIDKey
  const meta = Constants.getMeta(state, conversationIDKey)

  let admin = false
  let canEditChannel = false
  let canSetMinWriterRole = false
  let canSetRetention = false
  let canDeleteHistory = false
  if (meta.teamname) {
    const yourOperations = TeamConstants.getCanPerform(state, meta.teamname)
    admin = yourOperations.manageMembers
    canEditChannel = yourOperations.editTeamDescription
    canSetMinWriterRole = yourOperations.setMinWriterRole
    canSetRetention = yourOperations.setRetentionPolicy
    canDeleteHistory = yourOperations.deleteChatHistory
  }
  const isPreview = meta.membershipType === 'youArePreviewing'
  const selectedTab = ownProps.selectedTab || (isPreview ? 'members' : 'settings')
  const selectedAttachmentView = ownProps.selectedAttachmentView || RPCChatTypes.localGalleryItemTyp.media
  console.log('VIEW: ' + selectedAttachmentView)
  const attachmentsLoading =
    selectedTab === 'attachments' &&
    state.chat2.attachmentViewMap.getIn(
      [conversationIDKey, selectedAttachmentView],
      Constants.makeAttachmentViewInfo()
    ).status === 'loading'
  const media = state.chat2.attachmentViewMap.getIn(
    [conversationIDKey, RPCChatTypes.localGalleryItemTyp.media],
    Constants.makeAttachmentViewInfo()
  )
  const docs = state.chat2.attachmentViewMap.getIn(
    [conversationIDKey, RPCChatTypes.localGalleryItemTyp.doc],
    Constants.makeAttachmentViewInfo()
  )
  const links = state.chat2.attachmentViewMap.getIn(
    [conversationIDKey, RPCChatTypes.localGalleryItemTyp.link],
    Constants.makeAttachmentViewInfo()
  )
  return {
    _docs: docs,
    _docsFromMsgID: getFromMsgID(docs),
    _links: links,
    _linksFromMsgID: getFromMsgID(links),
    _media: media,
    _mediaFromMsgID: getFromMsgID(media),
    _infoMap: state.users.infoMap,
    _participants: meta.participants,
    _teamMembers: state.teams.teamNameToMembers.get(meta.teamname, I.Map()),
    admin,
    attachmentsLoading,
    canDeleteHistory,
    canEditChannel,
    canSetMinWriterRole,
    canSetRetention,
    channelname: meta.channelname,
    description: meta.description,
    ignored: meta.status === RPCChatTypes.commonConversationStatus.ignored,
    isPreview,
    selectedAttachmentView,
    selectedConversationIDKey: conversationIDKey,
    selectedTab,
    smallTeam: meta.teamType !== 'big',
    spinnerForHide:
      state.waiting.counts.get(Constants.waitingKeyConvStatusChange(ownProps.conversationIDKey), 0) > 0,
    teamname: meta.teamname,
  }
}

const mapDispatchToProps = (dispatch, {conversationIDKey, onBack, onSelectAttachmentView}: OwnProps) => ({
  _navToRootChat: () => dispatch(Chat2Gen.createNavigateToInbox({findNewConversation: false})),
  _onEditChannel: (teamname: string) =>
    dispatch(
      RouteTreeGen.createNavigateAppend({
        path: [{props: {conversationIDKey, teamname}, selected: 'chatEditChannel'}],
      })
    ),
  _onShowClearConversationDialog: () => {
    dispatch(Chat2Gen.createNavigateToThread())
    dispatch(
      RouteTreeGen.createNavigateAppend({
        path: [{props: {conversationIDKey}, selected: 'chatDeleteHistoryWarning'}],
      })
    )
  },
  onHideConv: () => dispatch(Chat2Gen.createHideConversation({conversationIDKey})),
  onJoinChannel: () => dispatch(Chat2Gen.createJoinConversation({conversationIDKey})),
  onLeaveConversation: () => dispatch(Chat2Gen.createLeaveConversation({conversationIDKey})),
  onShowBlockConversationDialog: () => {
    dispatch(
      RouteTreeGen.createNavigateAppend({
        path: [
          {
            props: {conversationIDKey},
            selected: 'chatShowBlockConversationDialog',
          },
        ],
      })
    )
  },
  onShowNewTeamDialog: () => {
    dispatch(
      RouteTreeGen.createNavigateAppend({
        path: [
          {
            props: {conversationIDKey},
            selected: 'chatShowNewTeamDialog',
          },
        ],
      })
    )
  },
  onShowProfile: (username: string) => dispatch(createShowUserProfile({username})),
  onUnhideConv: () => dispatch(Chat2Gen.createUnhideConversation({conversationIDKey})),
  _onDocDownload: message => dispatch(Chat2Gen.createAttachmentDownload({message})),
  _onLoadMore: (viewType, fromMsgID) =>
    dispatch(Chat2Gen.createLoadAttachmentView({conversationIDKey, fromMsgID, viewType})),
  _onMediaClick: message => dispatch(Chat2Gen.createAttachmentPreviewSelect({message})),
  _onShowInFinder: message =>
    message.downloadPath &&
    dispatch(FsGen.createOpenLocalPathInSystemFileManager({localPath: message.downloadPath})),
  onAttachmentViewChange: viewType => {
    dispatch(Chat2Gen.createLoadAttachmentView({conversationIDKey, viewType}))
    onSelectAttachmentView(viewType)
  },
})

// state props
const mergeProps = (stateProps, dispatchProps, ownProps: OwnProps) => ({
  admin: stateProps.admin,
  attachmentsLoading: stateProps.attachmentsLoading,
  canDeleteHistory: stateProps.canDeleteHistory,
  canEditChannel: stateProps.canEditChannel,
  canSetMinWriterRole: stateProps.canSetMinWriterRole,
  canSetRetention: stateProps.canSetRetention,
  channelname: stateProps.channelname,
  customCancelText: 'Done',
  description: stateProps.description,
  ignored: stateProps.ignored,
  isPreview: stateProps.isPreview,
  onBack: ownProps.onBack,
  onCancel: ownProps.onCancel,
  onEditChannel: () => dispatchProps._onEditChannel(stateProps.teamname),
  onHideConv: dispatchProps.onHideConv,
  onJoinChannel: dispatchProps.onJoinChannel,
  onLeaveConversation: dispatchProps.onLeaveConversation,
  onSelectTab: ownProps.onSelectTab,
  onShowBlockConversationDialog: dispatchProps.onShowBlockConversationDialog,
  onShowClearConversationDialog: () => dispatchProps._onShowClearConversationDialog(),
  onShowNewTeamDialog: dispatchProps.onShowNewTeamDialog,
  onShowProfile: dispatchProps.onShowProfile,
  onUnhideConv: dispatchProps.onUnhideConv,
  participants: stateProps._participants
    .map(p => ({
      fullname: stateProps._infoMap.getIn([p, 'fullname'], ''),
      isAdmin: stateProps.teamname
        ? TeamConstants.userIsRoleInTeamWithInfo(stateProps._teamMembers, p, 'admin')
        : false,
      isOwner: stateProps.teamname
        ? TeamConstants.userIsRoleInTeamWithInfo(stateProps._teamMembers, p, 'owner')
        : false,
      username: p,
    }))
    .toArray(),
  selectedConversationIDKey: stateProps.selectedConversationIDKey,
  selectedTab: stateProps.selectedTab,
  smallTeam: stateProps.smallTeam,
  spinnerForHide: stateProps.spinnerForHide,
  teamname: stateProps.teamname,

  docs: {
    docs: stateProps._docs.messages
      .map(m => ({
        author: m.author,
        ctime: m.timestamp,
        downloading: m.transferState === 'downloading',
        name: m.title || m.fileName,
        onDownload: !isMobile && !m.downloadPath ? () => dispatchProps._onDocDownload(m) : null,
        onShowInFinder: !isMobile && m.downloadPath ? () => dispatchProps._onShowInFinder(m) : null,
        progress: m.transferProgress,
      }))
      .toArray(),
    onLoadMore: stateProps._docsFromMsgID
      ? () => dispatchProps._onLoadMore(RPCChatTypes.localGalleryItemTyp.doc, stateProps._docsFromMsgID)
      : null,
    status: stateProps._docs.status,
  },
  links: {
    links: stateProps._links.messages.reduce((l, m) => {
      m.unfurls.toList().map(u => {
        if (u.unfurl.unfurlType === RPCChatTypes.unfurlUnfurlType.generic && u.unfurl.generic) {
          l.push({
            author: m.author,
            ctime: m.timestamp,
            snippet: m.bodySummary.stringValue(),
            title: u.unfurl.generic.title,
            url: u.unfurl.generic.url,
          })
        }
      })
      return l
    }, []),
    onLoadMore: stateProps._linksFromMsgID
      ? () => dispatchProps._onLoadMore(RPCChatTypes.localGalleryItemTyp.link, stateProps._linksFromMsgID)
      : null,
    status: stateProps._links.status,
  },
  media: {
    onLoadMore: stateProps._mediaFromMsgID
      ? () => dispatchProps._onLoadMore(RPCChatTypes.localGalleryItemTyp.media, stateProps._mediaFromMsgID)
      : null,
    status: stateProps._media.status,
    thumbs: stateProps._media.messages
      .map(m => ({
        ctime: m.timestamp,
        height: m.previewHeight,
        isVideo: !!m.videoDuration,
        onClick: () => dispatchProps._onMediaClick(m),
        previewURL: m.previewURL,
        width: m.previewWidth,
      }))
      .toArray(),
  },
  onAttachmentViewChange: dispatchProps.onAttachmentViewChange,
  selectedAttachmentView: stateProps.selectedAttachmentView,
})

const ConnectedInfoPanel = connect<OwnProps, _, _, _, _>(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(InfoPanel)

type SelectorOwnProps = RouteProps<{conversationIDKey: Types.ConversationIDKey}, {}>

const mapStateToSelectorProps = (state, ownProps: SelectorOwnProps) => {
  const conversationIDKey: Types.ConversationIDKey = getRouteProps(ownProps, 'conversationIDKey')
  const meta = Constants.getMeta(state, conversationIDKey)
  const selectedTab = ownProps.navigation.getParam('tab')
  const selectedAttachmentView = ownProps.navigation.getParam('attachmentview')
  return {
    conversationIDKey,
    selectedAttachmentView,
    selectedTab,
    shouldNavigateOut: meta.conversationIDKey === Constants.noConversationIDKey,
  }
}

const mapDispatchToSelectorProps = (dispatch, {navigation}) => ({
  // Used by HeaderHoc.
  onBack: () => dispatch(Chat2Gen.createToggleInfoPanel()),
  onGoToInbox: () => dispatch(Chat2Gen.createNavigateToInbox({findNewConversation: true})),
  onSelectAttachmentView: view => navigation.setParams({attachmentview: view}),
  onSelectTab: tab => navigation.setParams({tab}),
})

const mergeSelectorProps = (stateProps, dispatchProps) => ({
  conversationIDKey: stateProps.conversationIDKey,
  onBack: dispatchProps.onBack,
  onGoToInbox: dispatchProps.onGoToInbox,
  onSelectAttachmentView: dispatchProps.onSelectAttachmentView,
  onSelectTab: dispatchProps.onSelectTab,
  selectedAttachmentView: stateProps.selectedAttachmentView,
  selectedTab: stateProps.selectedTab,
  shouldNavigateOut: stateProps.shouldNavigateOut,
})

type Props = {|
  conversationIDKey: Types.ConversationIDKey,
  onBack: () => void,
  onGoToInbox: () => void,
  onSelectTab: string => void,
  selectedTab: ?string,
  onSelectAttachmentView: RPCChatTypes.GalleryItemTyp => void,
  selectedAttachmentView: RPCChatTypes.GalleryItemTyp,
  shouldNavigateOut: boolean,
|}

class InfoPanelSelector extends React.PureComponent<Props> {
  componentDidUpdate(prevProps) {
    if (!prevProps.shouldNavigateOut && this.props.shouldNavigateOut) {
      this.props.onGoToInbox()
    }
  }
  render() {
    if (!this.props.conversationIDKey) {
      return null
    }

    return isMobile ? (
      <ConnectedInfoPanel
        onBack={undefined}
        onCancel={this.props.onBack}
        conversationIDKey={this.props.conversationIDKey}
        onSelectTab={this.props.onSelectTab}
        selectedTab={this.props.selectedTab}
        onSelectAttachmentView={this.props.onSelectAttachmentView}
        selectedAttachmentView={this.props.selectedAttachmentView}
      />
    ) : (
      <Box onClick={this.props.onBack} style={clickCatcherStyle}>
        <Box style={panelContainerStyle} onClick={evt => evt.stopPropagation()}>
          <ConnectedInfoPanel
            onBack={this.props.onBack}
            onSelectTab={this.props.onSelectTab}
            conversationIDKey={this.props.conversationIDKey}
            selectedTab={this.props.selectedTab}
            onSelectAttachmentView={this.props.onSelectAttachmentView}
            selectedAttachmentView={this.props.selectedAttachmentView}
          />
        </Box>
      </Box>
    )
  }
}

const clickCatcherStyle = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 39,
}
const panelContainerStyle = {
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  position: 'absolute',
  right: 0,
  top: 40,
  width: 320,
}

const InfoConnected = connect<SelectorOwnProps, _, _, _, _>(
  mapStateToSelectorProps,
  mapDispatchToSelectorProps,
  mergeSelectorProps
)(InfoPanelSelector)

export default InfoConnected
