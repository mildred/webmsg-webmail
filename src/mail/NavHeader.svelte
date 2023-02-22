<script>
  // vim: ft=html

  import { fancy, readable, derived, ready } from '../stores.js'
  import { mailboxes } from '../mailboxes.js'
  import { ctx } from '../context.js'
  import { config } from '../config.js'

  const mboxes = fancy([]).init(async (dests, {derive}) => {
    const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)
    derive(mailboxes[accountId], (dests, {ready, mailboxes}, {set}) => {
      if (!ready) return;
      set(mailboxes)
    })
  })

</script>

<nav>
  {#each $mboxes as mbox}
    {#if mbox.role == "inbox"}
      <a href="#/mail/inbox/">{mbox.name}</a>
    {:else if mbox.role == "trash"}
    {:else if mbox.role == "junk"}
    {:else if mbox.role == "sent"}
    {:else if mbox.role == "drafts"}
    {:else}
      <a href="#/mail/mailbox/{mbox.id}/">{mbox.name}</a>
    {/if}
  {/each}
  <!-- TODO: show utility mailboxes in a menu hidden away -->
  <!-- TODO: show sub-mailboxes -->
</nav>

<style>
nav {
  display: flex;
  flex-flow: row wrap;
  margin-left: auto;
  margin-right: auto;
  justify-content: center;
  padding: 2rem;
}

nav a {
  display: block;
  padding: 1rem;
  color: currentcolor;
  text-decoration: none;
  font-size: 1.2rem;
}

nav a:hover {
  background-color: #eee;
}
</style>
