import { writable, derived, get } from 'svelte/store';
import { jmap, fancy } from './stores.js'
import { mailbox_roles } from './mailboxes.js'
import { config } from './config.js'

export const ctx = newContextStore(mailbox_roles, config)

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
      console.log("[ctx] set JMAP session")
      const session = await jmap.request_session()
      if (!session) return // avoid loops if there is an error
      update(ctx => ({...ctx, session}))
      return // the above update with retrigger this callback
    }
    if (!accountId) {
      console.log("[ctx] set JMAP accountId")
      const accountId = await jmap.get_first_account_id()
      if (!accountId) return // avoid loops if there is an error
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

  // Initialize config
  ctx.derive(({accountId, config}) => {
    const $config = get(config)
    if (accountId != $config.accountId) {
      console.log("[ctx] initialize config accountId = %o", accountId)
      config.set(Object.assign($config, { accountId }))
    }
  })

  // mark as ready
  ctx.derive([ctx, config, mailbox_roles], (ctx) => {
    const ready = !! (
      ctx.jmap &&
      get(ctx.config).loaded &&
      get(ctx.mailbox_roles).role_ids )

    if (ready != ctx.ready) {
      console.log("[ctx] ready = %o", ready)
      return { ...ctx, ready }
    }
  })


  return ctx
}

