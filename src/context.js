import { writable, derived, get } from 'svelte/store';
import { jmap, fancy } from './stores.js'
import { mailbox_roles } from './mailboxes.js'
import { config } from './config.js'

export const ctx = newContextStore(mailbox_roles, config)

export const accountId = derived(ctx, ctx => ctx.accountId)

export { jmap }

function newContextStore(mailbox_roles, config){
  const ctx = fancy({
    mailbox_roles,
    config
  })

  // Update jmap client in context
  ctx.derive(jmap, (ctx, jmap) => {
    console.log("[ctx] new JMAP client")
    return {
      ...ctx,
      jmap,
      accountId: null,
      session: null
    }
  })

  // Define accountId and session if not set
  ctx.derive(async ({accountId, session, jmap}, update) => {
    // always return after an update to avoid infinite loops
    if (!jmap) return
    if (!session) {
      const session = await jmap.request_session()
      if (!session) return // avoid loops if there is an error
      console.log("[ctx] set JMAP session")
      update(ctx => ({...ctx, session}))
      return // the above update with retrigger this callback
    }
    if (!accountId) {
      const accountId = await jmap.get_first_account_id()
      if (!accountId) return // avoid loops if there is an error
      console.log("[ctx] set JMAP accountId = %s", accountId)
      update(ctx => ({...ctx, accountId}))
      return
    }
  })

  // Initialize mailbox roles
  ctx.derive(({accountId, mailbox_roles, jmap}) => {
    const $mailbox_roles = get(mailbox_roles)
    if (accountId != $mailbox_roles.accountId) {
      console.log("[ctx] initialize mailbox_roles accountId = %o", accountId)
      mailbox_roles.set({
        ...$mailbox_roles,
        accountId,
        jmap
      })
    }
  })

  // mark as ready
  ctx.derive([ctx, null, mailbox_roles], (_, [$ctx, $config, $mailbox_roles], {update_derive}) => {
    const { accountId } = $ctx

    if (accountId && !$config) {
      update_derive([ctx, config[accountId], mailbox_roles])
      return
    }

    const ready = {
      accountId: !! accountId,
      jmap: !! $ctx.jmap,
      config: !! $config?.loaded,
      mailbox_role_ids: !! $mailbox_roles.role_ids,
    }

    const all_ready = Object.values(ready).reduce((a,b) => a&&b, true)

    if (all_ready != $ctx.ready) {
      if (all_ready) console.log("[ctx] ready")
      else console.log("[ctx] not ready: %o", ready)
      return { ...$ctx, ready: all_ready }
    } else if (!all_ready) {
      console.log("[ctx] not ready: %o", ready)
    }
  })

  return ctx
}

