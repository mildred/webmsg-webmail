import { writable } from 'svelte/store';

export const all_roles = ['All', 'Archive', 'Drafts', 'Flagged', 'Important', 'Inbox', 'Junk', 'Sent', 'Subscribed', 'Trash']

export const mailbox_roles = newMailboxRoles()

function newMailboxRoles(){
  const mailbox_roles = writable({})
  mailbox_roles.subscribe(on_change)
  return mailbox_roles

  async function on_change(data) {
    const { jmap, accountId, role_ids } = data

    // If it was previously loaded but the account changed, nullify the loaded
    // data to mark it as not loaded
    if ((role_ids) && (!accountId || accountId != data.loadedAccountId)) {
      mailbox_roles.set({
        ...data,
        role_ids: null
      })
      return // will trigger callback again
    }

    // If not way to make requests, no account specified or if the data is loaded,
    // we have nothing to do
    if (!jmap || !accountId || accountId == data.loadedAccountId) {
      return
    }

    const resp = await jmap.request(
      all_roles.map(role => ['Mailbox/query', {
        accountId,
        filter: {
          role: role
        }
      }, role])
    )

    const new_role_ids = Object.assign(...all_roles.map(role => ({[role]: resp.get(role).ids})))

    mailbox_roles.set({
      ...data,
      role_ids: new_role_ids,
      loadedAccountId: accountId
    })
  }
}

