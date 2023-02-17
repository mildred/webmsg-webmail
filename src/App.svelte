<script>
  // vim: ft=html
  import { session, get } from './stores.js'
  import { JMAP } from './jmap.js'
  import { Route } from 'tinro';
  import Inbox from './mail/Inbox.svelte'
  import { newConfigStore } from './config.js';
  import { mailbox_roles } from './mailboxes.js'

  // jmap.set(new JMAP('https://test2.mx.webmsg.me', session))
  const jmap = new JMAP('https://test2.mx.webmsg.me', session)

  async function get_ctx() {
    // const $jmap = await ready(jmap)
    const accountId = await jmap.get_first_account_id()

    // Start up the mailbox roles store
    mailbox_roles.update(data => ({
      ...data,
      jmap,
      accountId,
    }))

    const ctx = {
      jmap,
      accountId,
      session: await jmap.request_session(),
      mailbox_roles,
    }

    ctx.config = newConfigStore(ctx)
    return ctx
  }
</script>

{#await get_ctx()}
  Connecting to the server...
{:then ctx}

  <Route path="/" redirect="/mail/inbox" />
  <Route path="/mail/inbox">
    <Inbox ctx={ctx} />
  </Route>

{/await}


