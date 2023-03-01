<script>
  // vim: ft=html
  import * as mdi from '@mdi/js';
  import { inview } from 'svelte-inview';

  import { async_derived, ready, dig_store, readable } from '../stores.js';
  import { accountId } from '../context.js'
  import { all_mailboxes_by_id } from '../mailboxes.js';
  import { thread_emails_store } from './threads.js'

  import Time from "svelte-time";
  import SvgIcon from '@jamescoyle/svelte-icon';
  import { BarLoader } from 'svelte-loading-spinners';
  import { Route } from 'tinro';

  import MailboxSettingsDialog from './MailboxSettingsDialog.svelte'
  import EmailBody from './EmailBody.svelte';
  import EmailIcon from './EmailIcon.svelte';

  export let mailboxId = null
  export let threadId

  let emailId = null

  let settings_opened = false

  let mailbox, emails
  $: mailbox = mailboxId ? dig_store({}, all_mailboxes_by_id, ready(accountId), mailboxId) : null
  $: emails = thread_emails_store({accountId, threadId})

  function setEmailId(id) {
    emailId = id
  }

  function scrollToEmail(article, [emailId, id]){
    if (id != emailId) return;

    article.scrollIntoView()
  }

</script>

<Route path="/email/:emailId/*" let:meta>
  { setEmailId(meta.params.emailId), "" }
</Route>

<div class="main">
  {#if mailboxId}
    <div class="back">
      <a href="#/mail/mailbox/{mailboxId}/">
        <SvgIcon type='mdi' path={mdi.mdiChevronLeft} />
        {#if ! $mailbox.id }
          Back
        {:else}
          Back to {$mailbox.name}
        {/if}
      </a>
    </div>
  {/if}

  {#each $emails.emails as email}
    <article class="email"
             class:unread={!email.keywords["$seen"]}
             class:current={email.id == emailId}
             use:scrollToEmail={[emailId, email.id]}>
      <EmailBody email={email} show_header={true} />
    </article>
  {/each}

  {#if $emails.loading }
    <center><BarLoader/></center>
  {/if}
</div>

<style>
.main {
  margin-left: auto;
  margin-right: auto;
  max-width: 60rem;
}
.main > * {
  margin-bottom: 1rem;
}
.back a {
  color: currentcolor;
  text-decoration: none;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
}

article.email {
  border: 1px solid #888;
  border-radius: 1rem;
  padding: 2rem;
}

article.email.unread {
  border: 2px solid orange;
}

article.email.current {
  outline: 8px solid #ddd;
}
</style>
