import { writable, derived, get } from 'svelte/store';
import { fancy, ready, jmap, Inhibitor } from './stores.js'
import { mailbox_roles } from './mailboxes.js'

export class Config {
  constructor(store, mailbox_roles) {
    if (store instanceof Config) throw "bug"

    this.store = store
    console.log("[config] new Config() config = %o", get(store))
    store.subscribe(data => {
      console.log("[config] new Config() config changed = %o", get(store))
    })
  }

  async ready() {
    return await ready(this.store, cfg => cfg.loaded)
  }

  get config() {
    return get(this.store)
  }

  subscribe(cb) {
    return this.store.subscribe(config => cb(this))
  }

  get loaded(){
    return this.config.loaded
  }

  add_address_mailbox_filter(header, address, mailbox) {
    this.store.update(config => {
      if (config.filters instanceof Array) config.filters = {}
      config.filters ||= {}
      config.filters[header] ||= {}
      config.filters[header][address] ||= {}
      config.filters[header][address].mailboxId = mailbox
      return config
    })
  }
}

export const config = new Proxy({}, {
  get(target, accountId) {
    target[accountId] ||= new Config(config_store[accountId], mailbox_roles)
    return target[accountId] 
  }
})

export const config_store = new Proxy({}, {
  get(target, accountId) {
    target[accountId] ||= newConfigStore(jmap, mailbox_roles, accountId)
    return target[accountId] 
  }
})

export function newConfigStore(jmap, mailbox_roles, accountId) {
  if (!accountId) throw new Error('missing accountId')
  const save = new Inhibitor()
  let prevent_save = 0

  const store = fancy({})

  store.validates(config => config)

  // Save config to JMAP email when it changes
  store.derive(async (config, update) => {
    if (save.inhibited) return
    const $jmap = await ready(jmap)

    console.log("[config %s] save config", accountId, config)
    const cfgUpdate = await save_config($jmap, accountId, mailbox_roles, config)
    // avoid calling set on the store, no need to notify subscribers
    // this is also to avoid loops. Modify the object in place.
    Object.assign(config, cfgUpdate)
  })

  // Fetch initial config
  store.init(async (_config, update_set) => {
    const $jmap = await ready(jmap)
    const $mailbox_roles = await ready(mailbox_roles, data => data.role_ids)

    console.log("[config %s] initial config fetch", accountId)
    const loaded_config = await load_config($jmap, accountId, mailbox_roles)
    const new_config = Object.assign(loaded_config, {
      accountId,
    })

    save.inhibit(() => {
      // Unconditionally set config to what we got from JMAP
      // This will drop any changes made to the config during the initial load
      // (there should not be any)
      console.log("[config %s] initial config load", accountId)
      update_set(new_config)
    })

    store.init(async (config, update_set) => {
      return await subscribe_config($jmap, accountId, config, new_config => {
        save.inhibit(() => {
          // Unconditionally set config to what we got from JMAP
          // This will drop any changes made to the config if there is a change on
          // the server. Most probably changes are saved first.
          console.log("[config %s] load config (server change)", accountId)
          update_set(Object.assign(new_config, {
            accountId,
          }))
        })
      })
    })
  })

  return store
}

async function load_config(jmap, accountId, mailbox_roles) {

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

    const loaded_config = {
      loaded: true,
      configMailboxId: mailbox_id,
    }

    console.log("[config] start with an empty config %o", loaded_config)

    await save_config(jmap, accountId, mailbox_roles, loaded_config, {})

    return loaded_config
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
  const data = email.list[0] ? JSON.parse(Object.values(email.list[0].bodyValues)[0].value) : null
  const state = email.state
  const blobId = email.list[0]?.blobId
  const id = email.list[0]?.id

  const loaded_config = {
    ...data,
    loaded: !!state,
    accountId,
    loadedAccountId: accountId,
    configState: state,
    configId: id,
    configBlobId: blobId,
    configMailboxId: mailbox_id,
  }

  console.log("[config] loaded %o", loaded_config)

  return loaded_config
}

async function subscribe_config(jmap, accountId, {configState, configMailboxId}, set) {
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

async function save_config(jmap, accountId, mailbox_roles, config, actual_config) {
  let { configBlobId, configState, loaded, configMailboxId } = config

  // Do not save a config that was never loaded
  if (!loaded) return

  // Perform some sanity checks
  // Reload the configuration to ensure that it did not change from under us and
  // that we are not overriding a config from another instance
  //
  // If we subscribe to config, this should never happen

  if (!actual_config) actual_config = await load_config(jmap, accountId, mailbox_roles)
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
