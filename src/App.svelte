<script>
  // vim: ft=html
  import { session, local, get, jmap, jmap_url } from './stores.js'
  import { JMAP } from './jmap.js'
  import { Route, router } from 'tinro';
  import Inbox from './mail/Inbox.svelte'
  import Mailbox from './mail/Mailbox.svelte'
  import Thread from './mail/Thread.svelte'
  import NavHeader from './mail/NavHeader.svelte';
  import { newConfigStore } from './config.js';
  import { mailbox_roles } from './mailboxes.js'
  import { ctx } from './context.js'
  import { BarLoader } from 'svelte-loading-spinners';

  if (!get(jmap_url).url) {
    jmap_url.update(store => ({...store, url: prompt("JMAP URL:", window.jmap_url || "https://example.org")}))
  }

  router.mode.hash()
  //addEventListener('hashchange', (e) => {
  //  console.log("[hashchange] %o", e, window.location.hash)
  //  router.goto(window.location.hash.substr(1))
  //});

  router.subscribe(route => {
    console.log("[tinro router]", route)
  })

</script>

{#if ! $ctx.ready}
  <main class="loading">
    <BarLoader/>
    <p>Connecting to the server...</p>
  </main>
{:else}

  <NavHeader />

  <Route path="/*" firstmatch>
    <Route path="/mail/mailbox/:mailboxId/thread/:threadId/*" let:meta>
      <Thread mailboxId={meta.params.mailboxId} threadId={meta.params.threadId} />
    </Route>
    <Route path="/mail/mailbox/:mailboxId/*" let:meta>
      <Mailbox mailboxId={meta.params.mailboxId} />
    </Route>
    <Route path="/mail/thread/:threadId/*" let:meta>
      <Thread threadId={meta.params.threadId} />
    </Route>
    <Route path="/mail/inbox/*">
      <Inbox />
    </Route>
    <Route path="/" redirect="/mail/inbox/" />
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
