import { writable } from 'svelte/store';
import { fancy, jmap, ready } from './stores.js'

export const all_roles = ['All', 'Archive', 'Drafts', 'Flagged', 'Important', 'Inbox', 'Junk', 'Sent', 'Trash']

export const mailboxes = new Proxy({}, {
  get(target, name, receiver) {
    return newMailboxes(jmap, name)
  }
})

export const mailbox_roles = newMailboxRoles()

function newMailboxes(jmap, accountId, parentId = null){
  return fancy({})
    .init(async (mailboxes, update) => {
      const $jmap = await ready(jmap)

      await refresh_mailboxes()

      update.add_finalizer($jmap.get_state_changes(async (data) => {
        const changed = data.changed[accountId] || {}
        const mailbox_changed = changed['Mailbox']
        if (mailbox_changed) await refresh_mailboxes()
      }))

      async function refresh_mailboxes(){
        console.log("[mailboxes] query mailboxes for account %s and parent", accountId, parentId)

        const resp = await $jmap.request([
          ['Mailbox/query', {
            accountId,
            filter: {
              parentId,
            }
          }, 'q'],
          ['Mailbox/get', {
            accountId,
            '#ids': { resultOf: 'q', name: 'Mailbox/query', path: '/ids' },
          }, 'g']
        ])

        const res = {
          ready: true,
          mailboxes: resp.get('g').list
        }

        console.log("[mailboxes] query mailboxes for account %s and parent = %o", accountId, parentId, res)

        update(res)
      }
    })
}

function newMailboxRoles(){
  const mailbox_roles = fancy({})

  // If it was previously loaded but the account changed, nullify the loaded
  // data to mark it as not loaded
  mailbox_roles.derive(async (data, update) => {
    const { jmap, accountId, role_ids } = data
    if ((role_ids) && (!accountId || accountId != data.loadedAccountId)) {
      console.log("[mailboxes] reset")
      return {
        ...data,
        role_ids: null
      }
    }
  })

  mailbox_roles.derive(async ({ jmap, accountId, role_ids, loadedAccountId }, update) => {

    // If not way to make requests, no account specified or if the data is loaded,
    // we have nothing to do
    if (!jmap || !accountId || accountId == loadedAccountId) return

    console.log("[mailboxes] query mailboxes")

    const resp = await jmap.request(
      all_roles.map(role => ['Mailbox/query', {
        accountId,
        filter: {
          role: role
        }
      }, role])
    )

    const new_role_ids = Object.assign(...all_roles.map(role => ({[role]: resp.get(role).ids})))

    update(data => ({
      ...data,
      role_ids: new_role_ids,
      loadedAccountId: accountId
    }))
  })

  return mailbox_roles
}

