<script>
  // vim: ft=html
  import { session, get, jmap } from './stores.js'
  import { JMAP } from './jmap.js'
  import { Route } from 'tinro';
  import Inbox from './mail/Inbox.svelte'
  import { newConfigStore } from './config.js';
  import { mailbox_roles } from './mailboxes.js'
  import { ctx } from './context.js'
  import { BarLoader } from 'svelte-loading-spinners';

  jmap.set(new JMAP('https://test2.mx.webmsg.me', session))
</script>

{#if ! $ctx.ready}
  <main class="loading">
    <BarLoader/>
    <p>Connecting to the server...</p>
  </main>
{:else}

  <Route path="/" redirect="/mail/inbox" />
  <Route path="/mail/inbox">
    <Inbox />
  </Route>

{/if}

<style>
main.loading {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
}
</style>
