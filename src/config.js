import { writable, derived, get } from 'svelte/store';
import { ready } from './stores.js'

export class ConfigMailbox {
  constructor(raw) {
    this.raw = raw
  }
}

export class Config {
  constructor(raw) {
    this.raw = raw || {}
  }

  update_after_save(cfgUpdate) {
    Object.assign(this.raw, cfgUpdate)
  }

  get mailboxes() {
    const mailboxes = this.raw.mailboxes || [
      {
        name: 'Inbox',
        role: 'Inbox',
        description: 'All incoming mail goes here before filtering'
      },
      {
        name: 'Home',
        description: 'Important mail to see first'
      },
      {
        name: 'Hidden',
        description: 'Less than important mail'
      },
      {
        name: 'News',
        description: 'News to read any time'
      },
      {
        name: 'Robots',
        description: 'Less important automated e-mails sent by robots'
      }
    ]
    return mailboxes.map(raw => new ConfigMailbox(raw))
  }
}

// export const config = newConfigStore()

export function newConfigStore(ctx) {
  let prevent_save = false

  const store = writable(new Config(), set => {
    let unsubscribe = () => {
      unsubscribe = null
    }

    load_and_subscribe_config(ctx, set_no_loop).then(unsub => {
      if (unsubscribe === null) unsub()
      else unsubscribe = unsub
    })

    function set_no_loop(...args) {
      prevent_save = true
      const res = set(...args)
      prevent_save = false
      return res
    }

    return unsubscribe
  })

  store.subscribe(config => {
    if (!prevent_save) {
      save_config(ctx, config.raw).then(cfgUpdate => config.update_after_save(cfgUpdate))
    }
  })

  return store
}

async function load_and_subscribe_config(ctx, set) {
  const raw_config = await load_config(ctx)
  set(new Config(raw_config))

  return await subscribe_config(ctx, raw_config, set)
}

async function load_config(ctx) {
  const {jmap, accountId, mailbox_roles} = ctx

  const { role_ids } = await ready(mailbox_roles, data => data.role_ids)

  const has_drafts_mailbox = role_ids['Drafts'].length > 0

  // Create the drafts mailbox if it does not exists
  // This also means there is no config, so stop there
  if (!has_drafts_mailbox) {
    const resp2 = await jmap.request([
      ['Mailbox/set', {
        accountId,
        create: {
          config: {
            parentId: null,
            role: 'Drafts',
            name: 'Drafts',
            isSubscribed: true
          }
        }
      }, '1']
    ])

    const mailbox_id = Object.keys(resp2.get('Mailbox/set').created)[0]

    const raw_config = {
      loaded: true,
      configMailboxId: mailbox_id,
    }

    console.log("[config] start with an empty config %o", raw_config)

    await save_config(ctx, raw_config, {})

    return raw_config
  }

  const mailbox_id = role_ids['Drafts'][0]

  const resp2 = await jmap.request([
    ['Email/query', {
      accountId,
      filter: {
        inMailbox: mailbox_id,
        from: 'webmsg-webmail-config+v1@invalid.example.org',
        // header: ['X-Webmsg-Webmail-Config', 'v1']
      }
    }, '1'],
    ['Email/get', {
      accountId,
      '#ids': { resultOf: '1', name: 'Email/query', path: '/ids' },
      fetchTextBodyValues: true
    }, '2']
  ])

  const email = resp2.get('Email/get')
  const data = email.list[0] ? JSON.parse(email.list[0].bodyValues['1'].value) : null
  const state = email.state
  const blobId = email.list[0]?.blobId
  const id = email.list[0]?.id

  const raw_config = {
    ...data,
    loaded: !!state,
    configState: state,
    configId: id,
    configBlobId: blobId,
    configMailboxId: mailbox_id,
  }

  console.log("[config] loaded %o", raw_config)

  return raw_config
}

async function subscribe_config({jmap, accountId}, {configState, configMailboxId}, set) {
  let state = configState
  const clear = await jmap.get_state_changes(async (data) => {
    const changed = data.changed[accountId] || {}
    const email_changed = changed['Email']

    const resp = await jmap.request([
      ['Email/queryChanges', {
        accountId,
        sinceQueryState: state,
        filter: {
          inMailbox: configMailboxId,
          from: 'webmsg-webmail-config+v1@invalid.example.org',
          // header: ['X-Webmsg-Webmail-Config', 'v1']
        }
      }, '1']
    ])

    console.log("[config] Email/queryChanges", resp)
    // TODO: get email changes and get the new config if any
  })

  return unsubscribe
  function unsubscribe() {
    // stop subscription to the config changes
    jmap.clear_get_state_changes(clear)
  }
}

async function save_config(ctx, config, actual_config) {
  const { jmap, accountId } = ctx
  const { configBlobId, configState, loaded, configMailboxId } = config

  // Do not save a config that was never loaded
  if (!loaded) return

  // Perform some sanity checks
  // Reload the configuration to ensure that it did not change from under us and
  // that we are not overriding a config from another instance
  //
  // If we subscribe to config, this should never happen

  if (!actual_config) actual_config = await load_config(ctx)
  if (actual_config.configBlobId && actual_config.configBlobId != configBlobId) {
    throw `Configuration mismatch blob ${actual_config.configBlobId} (actual) != ${configBlobId} (memory)`
  }

  // If the state changed, take the most recent state for the next operations 

  if (actual_config.configState != configState) {
    configState = actual_config.configState
  }

  const resp = await jmap.request([
    ['Email/query', {
      accountId,
      filter: {
        inMailbox: configMailboxId,
        from: 'webmsg-webmail-config+v1@invalid.example.org',
        // header: ['X-Webmsg-Webmail-Config', 'v1']
      }
    }, '1'],
    ['Email/set', {
      accountId,
      ifInState: configState,
      create: {
        configMail: {
          mailboxIds: { [config.configMailboxId]: true },
          'header:X-Webmsg-Webmail-Config': 'v1',
          from: [{
            name: "Webmsg-Webmail-Config",
            email: "webmsg-webmail-config+v1@invalid.example.org"
          }],
          subject: "Webmsg-Webmail configuration, do not remove",
          bodyStructure: {
            type: "text/plain",
            partId: "configPart"
          },
          bodyValues: {
            configPart: {
              value: JSON.stringify(config),
              isTruncated: false
            }
          }
        }
      },
      '#destroy': { resultOf: '1', name: 'Email/query', path: '/ids' }
    }, '2']
  ])

  return {
    configState: resp.get('Email/set').newState,
    configId: resp.get('Email/set').created.configMail.id,
    configBlobId: resp.get('Email/set').created.configMail.blobId
  }
}
