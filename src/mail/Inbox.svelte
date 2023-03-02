<script>
  // vim: ft=html
  import { readable, writable, ready, get, async_derived, fancy, dig_store } from '../stores.js';
  import EmailBody from './EmailBody.svelte';
  import EmailIcon from './EmailIcon.svelte';
  import InboxFilterDialog from './InboxFilterDialog.svelte'
  import TimeAgo from 'svelte-timeago';
  import Time from "svelte-time";
  import SvgIcon from '@jamescoyle/svelte-icon';
  import * as mdi from '@mdi/js';
  import { inview } from 'svelte-inview';
  import { ctx, accountId } from '../context.js'
  import { filter_all } from './filter.js'
  import { BarLoader } from 'svelte-loading-spinners';
  import { config } from '../config.js';
  import { mailbox_roles, all_mailboxes_by_id } from '../mailboxes.js';
  import { threads_store } from './threads.js'

  const mailboxId = new Promise(async (accept) => {
    const { accountId, jmap, mailbox_roles } = await ready(ctx, ctx => ctx.ready)
    const { role_ids } = await ready(mailbox_roles, data => data.role_ids)
    accept(role_ids['Inbox'][0])
  })

  let mailbox, threads
  $: mailbox = dig_store({}, all_mailboxes_by_id, ready(accountId), mailboxId)
  $: threads = threads_store({accountId, mailboxId})

  let expandedEmailId = null
  let filterEmailId = null

  function showThread(article, email) {
    if (expandedEmailId == email.id) {
      expandedEmailId = null
    } else {
      expandedEmailId = email.id
    }
  }

  let filter_updates = null
  let filter_processed = null
  async function run_filter(e){
    filter_updates = writable({})
    const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)
    const $mailboxId = await mailboxId
    filter_processed = await filter_all({jmap, accountId, config, mailboxId: $mailboxId}, filter_updates, (act) => {
      act[`mailboxIds/${$mailboxId}`] = false
    })
    filter_updates = null
  }
</script>

<div class="main">
{#if !$mailbox.id}
<center><BarLoader/></center>
{:else}
<h1>{$mailbox.name}</h1>

<center>
  {#if filter_updates}
    <p>{$filter_updates.state}</p>
    {#if $filter_updates.progress_total}
      <p>
        <span class="ui-progress" style="width: 20em"><span style="width: {100 * $filter_updates.progress_current / $filter_updates.progress_total}%"></span></span>
        {$filter_updates.progress_current} / {$filter_updates.progress_total}
      </p>
    {:else}
      <p><BarLoader/></p>
    {/if}
  {:else if filter_processed != null}
    <p>{filter_processed} emails filtered</p>
  {/if}
  <button disabled={!! filter_updates} on:click={run_filter}>run filters</button>
</center>

{#if $threads.total == null}
<p>loading emails...</p>
{:else}
<p>{$threads.total} emails in {$mailbox.name}</p>
{/if}
{#each $threads.emails as email}
  <article on:click={e => showThread(e.target, email)}>
    <div class="icon">
      <EmailIcon name={email.from[0].name} email={email.from[0].email} />
      {#if email.thread && email.thread.emailIds.length > 1}
        <div class="num-email">{email.thread.emailIds.length}</div>
      {/if}
    </div>
    <a class="summary" href="javascript:void(0)">
      <div class="summary-content">
        <div class="first-line">
          <span class="subject">{email.subject}</span>
        </div>
        <div class="second-line">
          <span class="author">{email.from[0].name}</span>
          –
          <span class="preview">{email.preview}</span>
        </div>
      </div>
      <div class="date" title={email.receivedAt}>
        <Time timestamp={email.receivedAt} format="ddd MMM D H:mm" />
      </div>
    </a>
    <div class="filters" on:click={e => {e.stopPropagation(); filterEmailId = email.id}}>
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiNoteMultiple} /> Filter</a>
      <a href="#/mail/thread/{email.threadId}/email/{email.id}/"><SvgIcon type='mdi' path={mdi.mdiArrowExpandAll} /> Open</a>
      <!--
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiHome} /> Home</a>
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiGhost} /> Hidden</a>
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiEmailNewsletter} /> News</a>
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiNoteMultiple} /> Background</a>
      -->
    </div>
  </article>
  {#if filterEmailId == email.id}
    <InboxFilterDialog
      on:close={e => {filterEmailId = null}}
      on:accept={run_filter}
      email={email} />
  {/if}
  {#if expandedEmailId == email.id}
    <EmailBody email={email} show_header={false}>
      <svelte:fragment slot="actions">
        <a href="#/mail/thread/{email.threadId}/email/{email.id}/"
           title="Open thread">
          <SvgIcon type='mdi' path={mdi.mdiArrowExpandAll} />
        </a>
      </svelte:fragment>
    </EmailBody>
  {/if}
{/each}
<p class="loading-next"
   use:inview={{}}
   on:enter={(e) => {if ($threads.next) $threads.next()}}>
  {$threads.emails.length} emails shown,
  {#if $threads.more}
    {$threads.more} more emails
  {:else}
    no more emails
  {/if}
  {#if $threads.next_loading}
    <br/><BarLoader/>
  {/if}
</p>

{/if}
</div>

<style>

.main {
  margin-left: auto;
  margin-right: auto;
  max-width: 60rem;
  border: 1px solid #888;
  border-radius: 1rem;
  padding: 2rem;
}

.main h1 {
  text-align: center;
  border-bottom: 2px solid #888
}

a {
  color: currentcolor;
  text-decoration: none;
}

article {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  gap: 1em;
  margin: 1em 0;
  pointer: cursor;
}

.icon {
  position: relative;
}

.num-email {
  width: 1.5em;
  height: 1.5em;
  border-radius: 1.5em;
  line-height: 1.5em;
  background-color: #000;
  color: #fff;
  text-align: center;
  position: absolute;
  right: 0;
  bottom: 0;
  font-weight: bold;
}

.summary {
  display: flex;
  flex-flow: row nowrap;
  gap: 1em;
  min-width: 0;
  flex: 1 1 auto;
}

.summary-content {
  min-width: 0;
  flex: 1 1 auto;
}

.first-line {
  font-size: 1.2em;
  white-space: nowrap;
  overflow: hidden;
}

.second-line {
  color: #888;
  white-space: nowrap;
  overflow: hidden;
}

.date {
  color: #888;
  flex: 0 0 auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

article:not(:hover) > .filters {
  display: none;
}

.filters {
  position: absolute;
  top: 0;
  right: 0;
  background-color: white;
  display: flex;
  justify-content: flex-end;
  flex-flow: row wrap;
  width: 16rem;
  flex: 0 0 16rem;
}

.filters > a {
  display: block;
  width: 7rem;
  overflow: hidden;
  white-space: nowrap;

  margin: 0.25em;
  background-color: #f8f8f8;
  border-radius: 0.25em;
  border: 1px solid #888;
}

.filters > a > svg {
  width: 1em;
  height: 1em;
}

p.loading-next {
  text-align: center;
  font-style: italic;
}

</style>

