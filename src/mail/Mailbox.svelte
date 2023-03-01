<script>
  // vim: ft=html
  import * as mdi from '@mdi/js';
  import { inview } from 'svelte-inview';

  import { async_derived, ready, dig_store } from '../stores.js';
  import { accountId } from '../context.js'
  import { all_mailboxes_by_id } from '../mailboxes.js';
  import { threads_store } from './threads.js'

  import Time from "svelte-time";
  import SvgIcon from '@jamescoyle/svelte-icon';
  import { BarLoader } from 'svelte-loading-spinners';

  import MailboxSettingsDialog from './MailboxSettingsDialog.svelte'
  import EmailBody from './EmailBody.svelte';
  import EmailIcon from './EmailIcon.svelte';

  export let mailboxId

  let settings_opened = false

  let mailbox, threads
  $: mailbox = dig_store({}, all_mailboxes_by_id, ready(accountId), mailboxId)
  $: threads = threads_store({accountId, mailboxId})

  let expandedEmailId = null
  function showThread(article, email) {
    if (expandedEmailId == email.id) {
      expandedEmailId = null
    } else {
      expandedEmailId = email.id
    }
  }

</script>


{#if settings_opened}
  <MailboxSettingsDialog mailbox={$mailbox} on:close={e => {settings_opened = false}}/>
{/if}

<div class="main">
  {#if ! $mailbox.id}
  <center><BarLoader/></center>
  {:else}
  <div class="settings">
    <button on:click={e => {settings_opened = true}}><SvgIcon type='mdi' path={mdi.mdiCogOutline} /></button>
  </div>
  <h1>{$mailbox.name}</h1>

  {#if $threads.total == null}
  <p>loading emails...</p>
  {:else}
  <p>{$threads.total} emails in {$mailbox.name}</p>
  {/if}

  {#each $threads.emails as email}
    <a href="#/mail/mailbox/{mailboxId}/thread/{email.threadId}/email/{email.id}/"><article on:click={e => showThread(e.target, email)}>
      <div class="icon">
        <EmailIcon name={email.from[0].name} email={email.from[0].email} />
        {#if email.thread && email.thread.emailIds.length > 1}
          <div class="num-email">{email.thread.emailIds.length}</div>
        {/if}
      </div>
      <div class="summary">
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
      </div>
    </article></a>
    {#if expandedEmailId == email.id}
      <EmailBody email={email} show_header={false} />
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

.main > .settings {
  float: right;
}

.main > .settings > button {
  background-color: transparent;
  border: none;
  cursor: pointer;
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

p.loading-next {
  text-align: center;
  font-style: italic;
}

</style>

