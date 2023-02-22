<script>
  // vim: ft=html
  import { async_derived, ready } from '../stores.js';
  import { ctx } from '../context.js'
  import { all_mailboxes_by_id } from '../mailboxes.js';
  import { BarLoader } from 'svelte-loading-spinners';
  import MailboxSettingsDialog from './MailboxSettingsDialog.svelte'
  import SvgIcon from '@jamescoyle/svelte-icon';
  import * as mdi from '@mdi/js';

  export let mailboxId

  let settings_opened = false

  let mailbox
  $: mailbox = mailbox_store(mailboxId)

  function mailbox_store(mailboxId) {
    return async_derived({}, async () => {
      const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)
      return all_mailboxes_by_id[accountId][mailboxId]
    })
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


  <div class="toolbar">
    <div class="buttons">
      <span class="button"><SvgIcon type='mdi' path={mdi.mdiViewList} /></span>
      <span class="button"><SvgIcon type='mdi' path={mdi.mdiViewAgenda} /></span>
    </div>

    <div class="buttons">
      <span class="button"><SvgIcon type='mdi' path={mdi.mdiFormatListChecks} /></span>
      <span class="button"><SvgIcon type='mdi' path={mdi.mdiFormatListText} /></span>
    </div>
  </div>

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
  width: 8rem;
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

