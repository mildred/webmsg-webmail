<script>
  // vim: ft=html
  import { session, get, jmap } from './stores.js'
  import { JMAP } from './jmap.js'
  import { Route } from 'tinro';
  import Inbox from './mail/Inbox.svelte'
  import { newConfigStore } from './config.js';
  import { mailbox_roles } from './mailboxes.js'
  import { ctx } from './context.js'

  jmap.set(new JMAP('https://test2.mx.webmsg.me', session))
</script>

{#if ! $ctx.ready}
  Connecting to the server...
{:else}

  <Route path="/" redirect="/mail/inbox" />
  <Route path="/mail/inbox">
    <Inbox />
  </Route>

{/if}


