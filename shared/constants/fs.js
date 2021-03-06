// @flow
import * as I from 'immutable'
import * as Types from './types/fs'
import * as RPCTypes from './types/rpc-gen'
import * as ChatConstants from './chat2'
import * as FsGen from '../actions/fs-gen'
import * as Flow from '../util/flow'
import * as Tabs from './tabs'
import * as SettingsConstants from './settings'
import {type TypedState} from '../util/container'
import {isLinux, isMobile} from './platform'
import uuidv1 from 'uuid/v1'
import {globalColors} from '../styles'
import {downloadFilePath, downloadFilePathNoSearch} from '../util/file'
import * as RouteTreeGen from '../actions/route-tree-gen'
import {type TypedActions} from '../actions/typed-actions-gen'
import flags from '../util/feature-flags'

export const syncToggleWaitingKey = 'fs:syncToggle'
export const sendLinkToChatFindConversationWaitingKey = 'fs:sendLinkToChatFindConversation'
export const sendLinkToChatSendWaitingKey = 'fs:sendLinkToChatSend'

export const defaultPath = Types.stringToPath('/keybase')

// See Installer.m: KBExitFuseKextError
export const ExitCodeFuseKextError = 4
// See Installer.m: KBExitFuseKextPermissionError
export const ExitCodeFuseKextPermissionError = 5
// See Installer.m: KBExitAuthCanceledError
export const ExitCodeAuthCanceledError = 6

export const makeNewFolder: I.RecordFactory<Types._NewFolder> = I.Record({
  hint: 'New Folder',
  name: 'New Folder',
  parentPath: Types.stringToPath('/keybase'),
  status: 'editing',
  type: 'new-folder',
})
export const emptyFolder = makeNewFolder()

export const prefetchNotStarted: Types.PrefetchNotStarted = I.Record({state: 'not-started'})()

export const prefetchComplete: Types.PrefetchComplete = I.Record({state: 'complete'})()

export const makePrefetchInProgress: I.RecordFactory<Types._PrefetchInProgress> = I.Record({
  bytesFetched: 0,
  bytesTotal: 0,
  endEstimate: 0,
  startTime: 0,
  state: 'in-progress',
})

const pathItemMetadataDefault = {
  lastModifiedTimestamp: 0,
  lastWriter: '',
  name: 'unknown',
  prefetchStatus: prefetchNotStarted,
  size: 0,
  writable: false,
}

export const makeFolder: I.RecordFactory<Types._FolderPathItem> = I.Record({
  ...pathItemMetadataDefault,
  children: I.Set(),
  progress: 'pending',
  type: 'folder',
})

export const makeMime: I.RecordFactory<Types._Mime> = I.Record({
  displayPreview: false,
  mimeType: '',
})

export const makeFile: I.RecordFactory<Types._FilePathItem> = I.Record({
  ...pathItemMetadataDefault,
  mimeType: null,
  type: 'file',
})

export const makeSymlink: I.RecordFactory<Types._SymlinkPathItem> = I.Record({
  ...pathItemMetadataDefault,
  linkTarget: '',
  type: 'symlink',
})

export const makeUnknownPathItem: I.RecordFactory<Types._UnknownPathItem> = I.Record({
  ...pathItemMetadataDefault,
  type: 'unknown',
})

export const unknownPathItem = makeUnknownPathItem()

export const tlfSyncEnabled: Types.TlfSyncEnabled = I.Record({mode: 'enabled'})()

export const tlfSyncDisabled: Types.TlfSyncDisabled = I.Record({mode: 'disabled'})()

export const makeTlfSyncPartial: I.RecordFactory<Types._TlfSyncPartial> = I.Record({
  enabledPaths: I.List(),
  mode: 'partial',
})

export const makeTlfConflict: I.RecordFactory<Types._TlfConflict> = I.Record({
  branch: '',
  state: 'none',
})

export const makeTlf: I.RecordFactory<Types._Tlf> = I.Record({
  conflict: makeTlfConflict(),
  isFavorite: false,
  isIgnored: false,
  isNew: false,
  name: '',
  resetParticipants: I.List(),
  syncConfig: null,
  teamId: '',
  tlfMtime: 0,
  /* See comment in constants/types/fs.js
  needsRekey: false,
  waitingForParticipantUnlock: I.List(),
  youCanUnlock: I.List(),
  */
})

export const makeSyncingFoldersProgress: I.RecordFactory<Types._SyncingFoldersProgress> = I.Record({
  bytesFetched: 0,
  bytesTotal: 0,
  endEstimate: 0,
  start: 0,
})

export const makePathUserSetting: I.RecordFactory<Types._PathUserSetting> = I.Record({
  sort: 'name-asc',
})

export const defaultPathUserSetting = makePathUserSetting({
  sort: 'name-asc',
})

export const defaultTlfListPathUserSetting = makePathUserSetting({
  sort: 'time-asc',
})

export const makeDownloadMeta: I.RecordFactory<Types._DownloadMeta> = I.Record({
  entryType: 'unknown',
  intent: 'none',
  localPath: '',
  opID: null,
  path: Types.stringToPath(''),
  type: 'download',
})

export const makeDownloadState: I.RecordFactory<Types._DownloadState> = I.Record({
  canceled: false,
  completePortion: 0,
  endEstimate: undefined,
  error: undefined,
  isDone: false,
  startedAt: 0,
})

export const makeDownload: I.RecordFactory<Types._Download> = I.Record({
  meta: makeDownloadMeta(),
  state: makeDownloadState(),
})

export const makeLocalHTTPServer: I.RecordFactory<Types._LocalHTTPServer> = I.Record({
  address: '',
  token: '',
})

export const makeUploads: I.RecordFactory<Types._Uploads> = I.Record({
  endEstimate: undefined,
  errors: I.Map(),

  syncingPaths: I.Set(),
  totalSyncingBytes: 0,
  writingToJournal: I.Set(),
})

export const makeTlfs: I.RecordFactory<Types._Tlfs> = I.Record({
  private: I.Map(),
  public: I.Map(),
  team: I.Map(),
})

const placeholderAction = FsGen.createPlaceholderAction()

const _makeError: I.RecordFactory<Types._FsError> = I.Record({
  errorMessage: 'unknown error',
  erroredAction: placeholderAction,
  retriableAction: undefined,
  time: 0,
})

// Populate `time` with Date.now() if not provided.
export const makeError = (record?: {
  time?: number,
  error: any,
  erroredAction: FsGen.Actions,
  retriableAction?: FsGen.Actions,
}): I.RecordOf<Types._FsError> => {
  let {time, error, erroredAction, retriableAction} = record || {}
  return _makeError({
    errorMessage: !error ? 'unknown error' : error.message || JSON.stringify(error),
    erroredAction,
    retriableAction,
    time: time || Date.now(),
  })
}

export const makeMoveOrCopySource: I.RecordFactory<Types._MoveOrCopySource> = I.Record({
  path: Types.stringToPath(''),
  type: 'move-or-copy',
})

export const makeIncomingShareSource: I.RecordFactory<Types._IncomingShareSource> = I.Record({
  localPath: Types.stringToLocalPath(''),
  type: 'incoming-share',
})

export const makeNoSource: I.RecordFactory<Types._NoSource> = I.Record({
  type: 'none',
})

export const makeDestinationPicker: I.RecordFactory<Types._DestinationPicker> = I.Record({
  destinationParentPath: I.List(),
  source: makeNoSource(),
})

export const makeSendAttachmentToChat: I.RecordFactory<Types._SendAttachmentToChat> = I.Record({
  convID: ChatConstants.noConversationIDKey,
  filter: '',
  path: Types.stringToPath('/keybase'),
  state: 'none',
})

export const makeSendLinkToChat: I.RecordFactory<Types._SendLinkToChat> = I.Record({
  channels: I.Map(),
  convID: ChatConstants.noConversationIDKey,
  path: Types.stringToPath('/keybase'),
  state: 'none',
})

export const makePathItemActionMenu: I.RecordFactory<Types._PathItemActionMenu> = I.Record({
  downloadKey: null,
  previousView: 'root',
  view: 'root',
})

export const makeDriverStatusUnknown: I.RecordFactory<Types._DriverStatusUnknown> = I.Record({
  type: 'unknown',
})

export const makeDriverStatusEnabled: I.RecordFactory<Types._DriverStatusEnabled> = I.Record({
  dokanOutdated: false,
  dokanUninstallExecPath: null,
  isDisabling: false,
  isNew: false,
  type: 'enabled',
})

export const makeDriverStatusDisabled: I.RecordFactory<Types._DriverStatusDisabled> = I.Record({
  isDismissed: false,
  isEnabling: false,
  kextPermissionError: false,
  type: 'disabled',
})

export const defaultDriverStatus = isLinux ? makeDriverStatusEnabled() : makeDriverStatusUnknown()

export const makeSystemFileManagerIntegration: I.RecordFactory<Types._SystemFileManagerIntegration> = I.Record(
  {
    driverStatus: defaultDriverStatus,
    showingBanner: false,
  }
)

export const makeKbfsDaemonStatus: I.RecordFactory<Types._KbfsDaemonStatus> = I.Record({
  online: false,
  rpcStatus: 'unknown',
})

export const makeSoftErrors: I.RecordFactory<Types._SoftErrors> = I.Record({
  pathErrors: I.Map(),
  tlfErrors: I.Map(),
})

export const makeSettings: I.RecordFactory<Types._Settings> = I.Record({
  isLoading: false,
  spaceAvailableNotificationThreshold: 0,
})

export const makeState: I.RecordFactory<Types._State> = I.Record({
  destinationPicker: makeDestinationPicker(),
  downloads: I.Map(),
  edits: I.Map(),
  errors: I.Map(),
  folderViewFilter: '',
  kbfsDaemonStatus: makeKbfsDaemonStatus(),
  loadingPaths: I.Map(),
  localHTTPServerInfo: makeLocalHTTPServer(),
  pathItemActionMenu: makePathItemActionMenu(),
  pathItems: I.Map([[Types.stringToPath('/keybase'), makeFolder()]]),
  pathUserSettings: I.Map(),
  sendAttachmentToChat: makeSendAttachmentToChat(),
  sendLinkToChat: makeSendLinkToChat(),
  settings: makeSettings(),
  sfmi: makeSystemFileManagerIntegration(),
  softErrors: makeSoftErrors(),
  syncingFoldersProgress: makeSyncingFoldersProgress(),
  tlfUpdates: I.List(),
  tlfs: makeTlfs(),
  uploads: makeUploads(),
})

export const makeUUID = () => uuidv1({}, Buffer.alloc(16), 0)

export const pathToRPCPath = (path: Types.Path): RPCTypes.Path => ({
  PathType: RPCTypes.simpleFSPathType.kbfs,
  kbfs: Types.pathToString(path).substring('/keybase'.length) || '/',
})

export const getPathTextColor = (path: Types.Path) => {
  const elems = Types.getPathElements(path)
  return elems.length >= 2 && elems[1] === 'public' ? globalColors.yellowGreen2 : globalColors.black
}

export const pathTypeToTextType = (type: Types.PathType) => (type === 'folder' ? 'BodySemibold' : 'Body')

export const splitTlfIntoUsernames = (tlf: string): Array<string> =>
  tlf
    .split(' ')[0]
    .replace(/#/g, ',')
    .split(',')

export const humanReadableFileSize = (size: number) => {
  const kib = 1024
  const mib = kib * kib
  const gib = mib * kib
  const tib = gib * kib

  if (!size) return ''
  if (size >= tib) return `${Math.round(size / tib)} TB`
  if (size >= gib) return `${Math.round(size / gib)} GB`
  if (size >= mib) return `${Math.round(size / mib)} MB`
  if (size >= kib) return `${Math.round(size / kib)} KB`
  return `${size} B`
}

export const editTypeToPathType = (type: Types.EditType): Types.PathType => {
  switch (type) {
    case 'new-folder':
      return 'folder'
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(type)
      return 'unknown'
  }
}

export const makeDownloadKey = (path: Types.Path) => `download:${Types.pathToString(path)}:${makeUUID()}`
export const getDownloadIntentFromAction = (
  action: FsGen.DownloadPayload | FsGen.ShareNativePayload | FsGen.SaveMediaPayload
): Types.DownloadIntent =>
  action.type === FsGen.download ? 'none' : action.type === FsGen.shareNative ? 'share' : 'camera-roll'

export const downloadFilePathFromPath = (p: Types.Path): Promise<Types.LocalPath> =>
  downloadFilePath(Types.getPathName(p))
export const downloadFilePathFromPathNoSearch = (p: Types.Path): string =>
  downloadFilePathNoSearch(Types.getPathName(p))

export const makeTlfUpdate: I.RecordFactory<Types._TlfUpdate> = I.Record({
  history: I.List(),
  path: Types.stringToPath(''),
  serverTime: 0,
  writer: '',
})

export const makeTlfEdit: I.RecordFactory<Types._TlfEdit> = I.Record({
  editType: 'unknown',
  filename: '',
  serverTime: 0,
})

const fsNotificationTypeToEditType = (fsNotificationType: number): Types.FileEditType => {
  switch (fsNotificationType) {
    case RPCTypes.kbfsCommonFSNotificationType.fileCreated:
      return 'created'
    case RPCTypes.kbfsCommonFSNotificationType.fileModified:
      return 'modified'
    case RPCTypes.kbfsCommonFSNotificationType.fileDeleted:
      return 'deleted'
    case RPCTypes.kbfsCommonFSNotificationType.fileRenamed:
      return 'renamed'
    default:
      return 'unknown'
  }
}

export const userTlfHistoryRPCToState = (
  history: Array<RPCTypes.FSFolderEditHistory>
): Types.UserTlfUpdates => {
  let updates = []
  history.forEach(folder => {
    const updateServerTime = folder.serverTime
    const path = pathFromFolderRPC(folder.folder)
    const tlfUpdates = folder.history
      ? folder.history.map(({writerName, edits}) =>
          makeTlfUpdate({
            history: I.List(
              edits
                ? edits.map(({filename, notificationType, serverTime}) =>
                    makeTlfEdit({
                      editType: fsNotificationTypeToEditType(notificationType),
                      filename,
                      serverTime,
                    })
                  )
                : []
            ),
            path,
            serverTime: updateServerTime,
            writer: writerName,
          })
        )
      : []
    updates = updates.concat(tlfUpdates)
  })
  return I.List(updates)
}

const supportedImgMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
export const viewTypeFromMimeType = (mime: ?Types.Mime): Types.FileViewType => {
  if (mime && mime.displayPreview) {
    const mimeType = mime.mimeType
    if (mimeType === 'text/plain') {
      return 'text'
    }
    if (supportedImgMimeTypes.has(mimeType)) {
      return 'image'
    }
    if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
      return 'av'
    }
    if (mimeType === 'application/pdf') {
      return 'pdf'
    }
  }
  return 'default'
}

export const canSaveMedia = (pathItem: Types.PathItem): boolean => {
  if (pathItem.type !== 'file' || !pathItem.mimeType) {
    return false
  }
  const mime = pathItem.mimeType
  return (
    viewTypeFromMimeType(mime) === 'image' ||
    // Can't rely on viewType === av here because audios can't be saved to
    // the camera roll.
    mime.mimeType.startsWith('video/')
  )
}

const encodePathForURL = (path: Types.Path) =>
  encodeURIComponent(Types.pathToString(path).slice(slashKeybaseSlashLength))
    .replace(
      // We need to do this because otherwise encodeURIComponent would encode
      // "/"s.  If we get a relative redirect (e.g. when requested resource is
      // index.html, we get redirected to "./"), we'd end up redirect to a wrong
      // resource.
      /%2F/g,
      '/'
    )
    // Additional characters that encodeURIComponent doesn't escape
    .replace(
      /[-_.!~*'()]/g,
      old =>
        `%${old
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()}`
    )

const slashKeybaseSlashLength = '/keybase/'.length
export const generateFileURL = (path: Types.Path, localHTTPServerInfo: Types.LocalHTTPServer): string => {
  const {address, token} = localHTTPServerInfo
  if (!address || !token) {
    return 'about:blank'
  }
  const encoded = encodePathForURL(path)
  return `http://${address}/files/${encoded}?token=${token}`
}

export const invalidTokenTitle = 'KBFS HTTP Token Invalid'

export const folderRPCFromPath = (path: Types.Path): ?RPCTypes.Folder => {
  const pathElems = Types.getPathElements(path)
  if (pathElems.length === 0) return null

  const visibility = Types.getVisibilityFromElems(pathElems)
  if (visibility === null) return null
  const isPrivate = visibility === 'private' || visibility === 'team'

  const name = Types.getPathNameFromElems(pathElems)
  if (name === '') return null

  return {
    conflictType: RPCTypes.favoriteFolderConflictType.none,
    created: false,
    folderType: Types.getRPCFolderTypeFromVisibility(visibility),
    name,
    notificationsOn: false,
    private: isPrivate,
  }
}

export const pathFromFolderRPC = (folder: RPCTypes.Folder): Types.Path => {
  const visibility = Types.getVisibilityFromRPCFolderType(folder.folderType)
  if (!visibility) return Types.stringToPath('')
  return Types.stringToPath(`/keybase/${visibility}/${folder.name}`)
}

export const showIgnoreFolder = (path: Types.Path, username?: string): boolean => {
  const elems = Types.getPathElements(path)
  if (elems.length !== 3) {
    return false
  }
  return ['public', 'private'].includes(elems[1]) && elems[2] !== username
}

export const syntheticEventToTargetRect = (evt?: SyntheticEvent<>): ?ClientRect =>
  isMobile ? null : evt ? (evt.target: window.HTMLElement).getBoundingClientRect() : null

export const invalidTokenError = new Error('invalid token')
export const notFoundError = new Error('not found')

export const makeEditID = (): Types.EditID => Types.stringToEditID(uuidv1())

export const getTlfListFromType = (tlfs: Types.Tlfs, tlfType: Types.TlfType): Types.TlfList => {
  switch (tlfType) {
    case 'private':
      return tlfs.private
    case 'public':
      return tlfs.public
    case 'team':
      return tlfs.team
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(tlfType)
      return I.Map()
  }
}

export const computeBadgeNumberForTlfList = (tlfList: Types.TlfList): number =>
  tlfList.reduce((accumulator, tlf) => (tlfIsBadged(tlf) ? accumulator + 1 : accumulator), 0)

export const computeBadgeNumberForAll = (tlfs: Types.Tlfs): number =>
  ['private', 'public', 'team']
    .map(tlfType => computeBadgeNumberForTlfList(getTlfListFromType(tlfs, tlfType)))
    .reduce((sum, count) => sum + count, 0)

export const getTlfListAndTypeFromPath = (
  tlfs: Types.Tlfs,
  path: Types.Path
): {
  tlfList: Types.TlfList,
  tlfType: Types.TlfType,
} => {
  const visibility = Types.getPathVisibility(path)
  switch (visibility) {
    case 'private':
    case 'public':
    case 'team':
      const tlfType: Types.TlfType = visibility
      return {tlfList: getTlfListFromType(tlfs, tlfType), tlfType}
    default:
      return {tlfList: I.Map(), tlfType: 'private'}
  }
}

export const unknownTlf = makeTlf()
export const getTlfFromPath = (tlfs: Types.Tlfs, path: Types.Path): Types.Tlf => {
  const elems = Types.getPathElements(path)
  if (elems.length < 3) {
    return unknownTlf
  }
  const {tlfList} = getTlfListAndTypeFromPath(tlfs, path)
  return tlfList.get(elems[2], unknownTlf)
}

export const getTlfFromTlfs = (tlfs: Types.Tlfs, tlfType: Types.TlfType, name: string): Types.Tlf => {
  switch (tlfType) {
    case 'private':
      return tlfs.private.get(name, makeTlf())
    case 'public':
      return tlfs.public.get(name, makeTlf())
    case 'team':
      return tlfs.team.get(name, makeTlf())
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(tlfType)
      return makeTlf()
  }
}

export const tlfTypeAndNameToPath = (tlfType: Types.TlfType, name: string): Types.Path =>
  Types.stringToPath(`/keybase/${tlfType}/${name}`)

export const resetBannerType = (state: TypedState, path: Types.Path): Types.ResetBannerType => {
  const resetParticipants = getTlfFromPath(state.fs.tlfs, path).resetParticipants
  if (resetParticipants.size === 0) {
    return 'none'
  }
  if (resetParticipants.findIndex(username => username === state.config.username) >= 0) {
    return 'self'
  }
  return resetParticipants.size
}

export const isPendingDownload = (download: Types.Download, path: Types.Path, intent: Types.DownloadIntent) =>
  download.meta.path === path && download.meta.intent === intent && !download.state.isDone

export const getUploadedPath = (parentPath: Types.Path, localPath: string) =>
  Types.pathConcat(parentPath, Types.getLocalPathName(localPath))

export const usernameInPath = (username: string, path: Types.Path) => {
  const elems = Types.getPathElements(path)
  return elems.length >= 3 && elems[2].split(',').includes(username)
}

export const isOfflineUnsynced = (
  daemonStatus: Types.KbfsDaemonStatus,
  pathItem: Types.PathItem,
  path: Types.Path
) =>
  flags.kbfsOfflineMode &&
  !daemonStatus.online &&
  Types.getPathLevel(path) > 2 &&
  pathItem.prefetchStatus !== prefetchComplete

// To make sure we have consistent badging, all badging related stuff should go
// through this function. That is:
// * When calculating number of TLFs being badged, a TLF should be counted if
//   and only if this function returns true.
// * When an individual TLF is shown (e.g. as a row), it should be badged if
//   and only if this funciton returns true.
//
// If we add more badges, this function should be updated.
export const tlfIsBadged = (tlf: Types.Tlf) => !tlf.isIgnored && tlf.isNew

export const pathsInSameTlf = (a: Types.Path, b: Types.Path): boolean => {
  const elemsA = Types.getPathElements(a)
  const elemsB = Types.getPathElements(b)
  return elemsA.length >= 3 && elemsB.length >= 3 && elemsA[1] === elemsB[1] && elemsA[2] === elemsB[2]
}

export const escapePath = (path: Types.Path): string =>
  Types.pathToString(path).replace(/(\\)|( )/g, (match, p1, p2) => `\\${p1 || p2}`)
export const unescapePath = (escaped: string): Types.Path =>
  // turns "\\" into "\", and "\ " into " "
  Types.stringToPath(escaped.replace(/\\(\\)|\\( )/g, (match, p1, p2) => p1 || p2))

export const parsedPathRoot: Types.ParsedPathRoot = I.Record({kind: 'root'})()
export const parsedPathPrivateList: Types.ParsedPathTlfList = I.Record({
  kind: 'tlf-list',
  tlfType: 'private',
})()
export const parsedPathPublicList: Types.ParsedPathTlfList = I.Record({kind: 'tlf-list', tlfType: 'public'})()
export const parsedPathTeamList: Types.ParsedPathTlfList = I.Record({kind: 'tlf-list', tlfType: 'team'})()

const makeParsedPathGroupTlf: I.RecordFactory<Types._ParsedPathGroupTlf> = I.Record({
  kind: 'group-tlf',
  readers: null,
  tlfName: '',
  tlfType: 'private',
  writers: I.List(),
})

const makeParsedPathTeamTlf: I.RecordFactory<Types._ParsedPathTeamTlf> = I.Record({
  kind: 'team-tlf',
  team: '',
  tlfName: '',
  tlfType: 'team',
})

const makeParsedPathInGroupTlf: I.RecordFactory<Types._ParsedPathInGroupTlf> = I.Record({
  kind: 'in-group-tlf',
  readers: null,
  rest: I.List(),
  tlfName: '',
  tlfType: 'private',
  writers: I.List(),
})

const makeParsedPathInTeamTlf: I.RecordFactory<Types._ParsedPathInTeamTlf> = I.Record({
  kind: 'in-team-tlf',
  rest: I.List(),
  team: '',
  tlfName: '',
  tlfType: 'team',
})

const splitTlfIntoReadersAndWriters = (
  tlf: string
): {|readers: ?I.List<string>, writers: I.List<string>|} => {
  const [w, r] = tlf.split('#')
  return {
    readers: r ? I.List(r.split(',').filter(i => !!i)) : null,
    writers: I.List(w.split(',').filter(i => !!i)),
  }
}

// returns parsedPathRoot if unknown
export const parsePath = (path: Types.Path): Types.ParsedPath => {
  const elems = Types.getPathElements(path)
  if (elems.length <= 1) {
    return parsedPathRoot
  }
  switch (elems[1]) {
    case 'private':
      switch (elems.length) {
        case 2:
          return parsedPathPrivateList
        case 3:
          return makeParsedPathGroupTlf({
            ...splitTlfIntoReadersAndWriters(elems[2]),
            tlfName: elems[2],
            tlfType: 'private',
          })
        default:
          return makeParsedPathInGroupTlf({
            ...splitTlfIntoReadersAndWriters(elems[2]),
            rest: I.List(elems.slice(3)),
            tlfName: elems[2],
            tlfType: 'private',
          })
      }
    case 'public':
      switch (elems.length) {
        case 2:
          return parsedPathPublicList
        case 3:
          return makeParsedPathGroupTlf({
            ...splitTlfIntoReadersAndWriters(elems[2]),
            tlfName: elems[2],
            tlfType: 'public',
          })
        default:
          return makeParsedPathInGroupTlf({
            ...splitTlfIntoReadersAndWriters(elems[2]),
            rest: I.List(elems.slice(3)),
            tlfName: elems[2],
            tlfType: 'public',
          })
      }
    case 'team':
      switch (elems.length) {
        case 2:
          return parsedPathTeamList
        case 3:
          return makeParsedPathTeamTlf({
            team: elems[2],
            tlfName: elems[2],
            tlfType: 'team',
          })
        default:
          return makeParsedPathInTeamTlf({
            rest: I.List(elems.slice(3)),
            team: elems[2],
            tlfName: elems[2],
            tlfType: 'team',
          })
      }
    default:
      return parsedPathRoot
  }
}

export const canSendLinkToChat = (parsedPath: Types.ParsedPath) => {
  switch (parsedPath.kind) {
    case 'root':
    case 'tlf-list':
      return false
    case 'group-tlf':
    case 'team-tlf':
      return false
    case 'in-group-tlf':
    case 'in-team-tlf':
      return parsedPath.tlfType !== 'public'
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(parsedPath)
      return false
  }
}

export const canChat = (path: Types.Path) => {
  const parsedPath = parsePath(path)
  switch (parsedPath.kind) {
    case 'root':
    case 'tlf-list':
      return false
    case 'group-tlf':
    case 'team-tlf':
      return true
    case 'in-group-tlf':
    case 'in-team-tlf':
      return true
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(parsedPath)
      return false
  }
}

export const isTeamPath = (path: Types.Path): boolean => {
  const parsedPath = parsePath(path)
  return parsedPath.kind !== 'root' && parsedPath.tlfType === 'team'
}

export const getChatTarget = (path: Types.Path, me: string): string => {
  const parsedPath = parsePath(path)
  if (parsedPath.kind !== 'root' && parsedPath.tlfType === 'team') {
    return 'team conversation'
  }
  if (parsedPath.kind === 'group-tlf' || parsedPath.kind === 'in-group-tlf') {
    if (parsedPath.writers.size === 1 && !parsedPath.readers && parsedPath.writers.first() === me) {
      return 'yourself'
    }
    if (parsedPath.writers.size + (parsedPath.readers ? parsedPath.readers.size : 0) === 2) {
      const notMe = parsedPath.writers.concat(parsedPath.readers || []).filter(u => u !== me)
      if (notMe.size === 1) {
        return notMe.first()
      }
    }
    return 'group conversation'
  }
  return 'conversation'
}

const humanizeDownloadIntent = (intent: Types.DownloadIntent) => {
  switch (intent) {
    case 'camera-roll':
      return 'save'
    case 'share':
      return 'prepare to share'
    case 'none':
      return 'download'
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(intent)
      return ''
  }
}

export const getDestinationPickerPathName = (picker: Types.DestinationPicker): string =>
  picker.source.type === 'move-or-copy'
    ? Types.getPathName(picker.source.path)
    : picker.source.type === 'incoming-share'
    ? Types.getLocalPathName(picker.source.localPath)
    : ''

const isPathEnabledForSync = (syncConfig: Types.TlfSyncConfig, path: Types.Path): boolean => {
  switch (syncConfig.mode) {
    case 'disabled':
      return false
    case 'enabled':
      return true
    case 'partial':
      // TODO: when we enable partial sync lookup, remember to deal with
      // potential ".." traversal as well.
      return syncConfig.enabledPaths.includes(path)
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(syncConfig.mode)
      return false
  }
}

export const getSyncStatusInMergeProps = (
  kbfsDaemonStatus: Types.KbfsDaemonStatus,
  tlf: Types.Tlf,
  pathItem: Types.PathItem,
  uploadingPaths: I.Set<Types.Path>,
  path: Types.Path
): Types.SyncStatus => {
  if (!tlf.syncConfig || (pathItem === unknownPathItem && tlf.syncConfig.mode !== 'disabled')) {
    return 'unknown'
  }
  const tlfSyncConfig: Types.TlfSyncConfig = tlf.syncConfig
  // uploading state has higher priority
  if (uploadingPaths.has(path)) {
    return kbfsDaemonStatus.online ? 'uploading' : 'awaiting-to-upload'
  }
  if (!isPathEnabledForSync(tlfSyncConfig, path)) {
    return 'online-only'
  }

  // TODO: what about 'sync-error'?

  // We don't have an upload state, and sync is enabled for this path.
  switch (pathItem.prefetchStatus.state) {
    case 'not-started':
      return 'awaiting-to-sync'
    case 'complete':
      return 'synced'
    case 'in-progress':
      if (!kbfsDaemonStatus.online) {
        return 'awaiting-to-sync'
      }
      const inProgress: Types.PrefetchInProgress = pathItem.prefetchStatus
      if (inProgress.bytesTotal === 0) {
        return 'awaiting-to-sync'
      }
      return inProgress.bytesFetched / inProgress.bytesTotal
    default:
      Flow.ifFlowComplainsAboutThisFunctionYouHaventHandledAllCasesInASwitch(pathItem.prefetchStatus.state)
      return 'unknown'
  }
}

export const makeActionsForDestinationPickerOpen = (
  index: number,
  path: Types.Path,
  routePath?: ?I.List<string>
): Array<TypedActions> => [
  FsGen.createSetDestinationPickerParentPath({
    index,
    path,
  }),
  RouteTreeGen.createNavigateAppend({
    path: [{props: {index}, selected: 'destinationPicker'}],
  }),
]

export const fsRootRouteForNav1 = isMobile ? [Tabs.settingsTab, SettingsConstants.fsTab] : [Tabs.fsTab]

export const makeActionForOpenPathInFilesTab = (
  path: Types.Path // TODO: remove the second arg when we are done with migrating to nav2
): TypedActions => RouteTreeGen.createNavigateAppend({path: [{props: {path}, selected: 'fsRoot'}]})

export const putActionIfOnPathForNav1 = (action: TypedActions, routePath?: ?I.List<string>) => action

export const makeActionsForShowSendLinkToChat = (
  path: Types.Path,
  routePath?: ?I.List<string>
): Array<TypedActions> => [
  FsGen.createInitSendLinkToChat({path}),
  putActionIfOnPathForNav1(
    RouteTreeGen.createNavigateAppend({
      path: [{props: {path}, selected: 'sendLinkToChat'}],
    }),
    routePath
  ),
]

export const makeActionsForShowSendAttachmentToChat = (
  path: Types.Path,
  routePath?: ?I.List<string>
): Array<TypedActions> => [
  FsGen.createInitSendAttachmentToChat({path}),
  putActionIfOnPathForNav1(
    RouteTreeGen.createNavigateAppend({
      path: [{props: {path}, selected: 'sendAttachmentToChat'}],
    }),
    routePath
  ),
]

// TODO(KBFS-4129): make this actually able to check out-of-spaceness
export const getMainBannerType = (
  kbfsDaemonStatus: Types.KbfsDaemonStatus,
  overallSyncStatus: any
): Types.MainBannerType =>
  kbfsDaemonStatus.online
    ? overallSyncStatus === null
      ? 'none'
      : 'out-of-space'
    : flags.kbfsOfflineMode
    ? 'offline'
    : 'none'

export const isFolder = (path: Types.Path, pathItem: Types.PathItem) =>
  Types.getPathLevel(path) <= 3 || pathItem.type === 'folder'

export const humanizeBytes = (n: number, d: number): string => {
  const kb = 1024
  const mb = kb * 1024
  const gb = mb * 1024

  if (d < kb) {
    return `${n} of ${d} bytes`
  } else if (d < mb) {
    return `${(n / kb).toFixed(2)} of ${(d / kb).toFixed(2)} KB`
  } else if (d < gb) {
    return `${(n / mb).toFixed(2)} of ${(d / mb).toFixed(2)} MB`
  }
  return `${(n / gb).toFixed(2)} of ${(d / gb).toFixed(2)} GB`
}

export const getTlfPath = (path: Types.Path): ?Types.Path => {
  const elems = Types.getPathElements(path)
  return elems.length > 2 ? Types.pathConcat(Types.pathConcat(defaultPath, elems[1]), elems[2]) : null
}

export const getPathUserSetting = (
  pathUserSettings: I.Map<Types.Path, Types.PathUserSetting>,
  path: Types.Path
): Types.PathUserSetting =>
  pathUserSettings.get(
    path,
    Types.getPathLevel(path) < 3 ? defaultTlfListPathUserSetting : defaultPathUserSetting
  )

export const showSortSetting = (
  path: Types.Path,
  pathItem: Types.PathItem,
  kbfsDaemonStatus: Types.KbfsDaemonStatus
) =>
  !isMobile &&
  path !== defaultPath &&
  (Types.getPathLevel(path) === 2 || (pathItem.type === 'folder' && !!pathItem.children.size)) &&
  !isOfflineUnsynced(kbfsDaemonStatus, pathItem, path)

export const getSoftError = (softErrors: Types.SoftErrors, path: Types.Path): ?Types.SoftError => {
  const pathError = softErrors.pathErrors.get(path)
  if (pathError) {
    return pathError
  }
  if (!softErrors.tlfErrors.size) {
    return null
  }
  const tlfPath = getTlfPath(path)
  return tlfPath ? softErrors.tlfErrors.get(tlfPath) : null
}

export const erroredActionToMessage = (action: FsGen.Actions, error: string): string => {
  // We have FsError.expectedIfOffline now to take care of real offline
  // scenarios, but we still need to keep this timeout check here in case we
  // get a timeout error when we think we think we're online. In this case it's
  // likely bad network condition.
  const errorIsTimeout = error.includes('context deadline exceeded')
  const timeoutExplain = 'An operation took too long to complete. Are you connected to the Internet?'
  const suffix = errorIsTimeout ? ` ${timeoutExplain}` : ''
  switch (action.type) {
    case FsGen.move:
      return 'Failed to move file(s).' + suffix
    case FsGen.copy:
      return 'Failed to copy file(s).' + suffix
    case FsGen.favoritesLoad:
      return 'Failed to load TLF lists.' + suffix
    case FsGen.refreshLocalHTTPServerInfo:
      return 'Failed to get information about internal HTTP server.' + suffix
    case FsGen.loadPathMetadata:
      return `Failed to load file metadata: ${Types.getPathName(action.payload.path)}.` + suffix
    case FsGen.folderListLoad:
      return `Failed to list folder: ${Types.getPathName(action.payload.path)}.` + suffix
    case FsGen.download:
      return `Failed to download: ${Types.getPathName(action.payload.path)}.` + suffix
    case FsGen.shareNative:
      return `Failed to share: ${Types.getPathName(action.payload.path)}.` + suffix
    case FsGen.saveMedia:
      return `Failed to save: ${Types.getPathName(action.payload.path)}.` + suffix
    case FsGen.upload:
      return `Failed to upload: ${Types.getLocalPathName(action.payload.localPath)}.` + suffix
    case FsGen.favoriteIgnore:
      return `Failed to ignore: ${Types.pathToString(action.payload.path)}.` + suffix
    case FsGen.openPathInSystemFileManager:
      return `Failed to open path: ${Types.pathToString(action.payload.path)}.` + suffix
    case FsGen.openLocalPathInSystemFileManager:
      return `Failed to open path: ${action.payload.localPath}.` + suffix
    case FsGen.deleteFile:
      return `Failed to delete file: ${Types.pathToString(action.payload.path)}.` + suffix
    case FsGen.downloadSuccess:
      return (
        `Failed to ${humanizeDownloadIntent(action.payload.intent)}. ` +
        (errorIsTimeout ? timeoutExplain : `Error: ${error}.`)
      )
    case FsGen.pickAndUpload:
      return 'Failed to upload. ' + (errorIsTimeout ? timeoutExplain : `Error: ${error}.`)
    case FsGen.driverEnable:
      return 'Failed to enable driver.'
    default:
      return errorIsTimeout ? timeoutExplain : 'An unexplainable error has occurred.'
  }
}
