<script>
  // vim: ft=html
  import { readable, ready, get } from '../stores.js';
  import EmailBody from './EmailBody.svelte';
  import EmailIcon from './EmailIcon.svelte';
  import TimeAgo from 'svelte-timeago';
  import Time from "svelte-time";
  import SvgIcon from '@jamescoyle/svelte-icon';
  import * as mdi from '@mdi/js';
  import { ctx } from '../context.js'

  const threads = readable([], async (set) => {
    const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)
    const resp = await jmap.request([
      ['Email/query', {
        accountId,
        collapseThreads: true,
        sort: [
          { property: 'receivedAt', isAscending: false }
        ],
        position: 0,
        limit: 100,
        calculateTotal: true,
      }, '0'],
      ['Email/get', {
        accountId,
        '#ids': { resultOf: '0', name: 'Email/query', path: '/ids' }
      }, '1'],
      ['Thread/get', {
        accountId,
        '#ids': { resultOf: '1', name: 'Email/get', path: '/list/*/threadId' }
      }, '2']
    ])

    const threads = resp.get('Thread/get').list.reduce((h,v) => ({...h, [v.id]: v}), {})
    const emails = resp.get('Email/get').list.map(v => ({...v, thread: threads[v.threadId]}))
    set(emails)

    return stop
    function stop() {
    }
  })

  let expandedEmailId = null

  function showThread(article, email) {
    if (expandedEmailId == email.id) {
      expandedEmailId = null
    } else {
      expandedEmailId = email.id
    }
    console.log(email)
  }

</script>

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

</style>

<div class="main">
<h1>Inbox</h1>

{#each $threads as email}
  <article on:click={e => showThread(e.target, email)}>
    <div class="icon">
      <EmailIcon name={email.from[0].name} email={email.from[0].email} />
      {#if email.thread.emailIds.length > 1}
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
    <div class="filters">
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiHome} /> Home</a>
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiGhost} /> Hidden</a>
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiEmailNewsletter} /> News</a>
      <a href="#"><SvgIcon type='mdi' path={mdi.mdiNoteMultiple} /> Background</a>
    </div>
  </article>
  {#if expandedEmailId == email.id}
  <EmailBody email={email} show_header={false} />
  {/if}
{/each}

</div>

