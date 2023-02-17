<script>
  // vim: ft=html
  import { session } from './stores.js'
  import { JMAP } from './jmap.js'
  import { Route } from 'tinro';
  import Inbox from './mail/Inbox.svelte'
  import { newConfigStore } from './config.js';

  const jmap = new JMAP('https://test2.mx.webmsg.me', session)

  async function get_ctx() {
    const ctx = {
      jmap,
      accountId: await jmap.get_first_account_id(),
      session: await jmap.request_session(),
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


