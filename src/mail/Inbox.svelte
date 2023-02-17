<script>
  // vim: ft=html
  import { readable } from 'svelte/store';
  import EmailIcon from './EmailIcon.svelte';
  import TimeAgo from 'svelte-timeago';
  import Time from "svelte-time";

  export let ctx;

  const threads = readable([], async (set) => {
    const { accountId, jmap } = ctx
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
  display: flex;
  flex-flow: row nowrap;
  gap: 1em;
  margin: 1em 0;
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
}

</style>

<div class="main">
<h1>Inbox</h1>

{#each $threads as email}
  <article>
    <div class="icon">
      <EmailIcon name={email.from[0].name} email={email.from[0].email} />
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
    <slot name="actions" email={email}/>
  </article>
{/each}

</div>

