<script>
  // vim: ft=html

  import { fancy, readable, derived, ready } from '../stores.js'
  import { mailboxes } from '../mailboxes.js'
  import { createEventDispatcher } from 'svelte';
  import { ctx } from '../context.js'
  import {
    Dialog,
    DialogOverlay,
    DialogTitle,
    DialogDescription,
  } from "@rgossiaux/svelte-headlessui";

  export let email = {};

  let completeButton = null
  let isOpen = true
  const dispatch = createEventDispatcher();
  const dests = get_dests()

  $: headers = get_headers(email)

  function get_headers(email) {
    return fancy(list_all(email))
      .derive(ctx, async (opts, { ready, jmap, accountId }, update) => {
        if (!ready) return
        const resp = await jmap.request([
          ['Email/get', {
            accountId,
            ids: [email.id],
            properties: [
              'from', 'to', 'cc', 'bcc',
              'header:Delivered-To:asAddresses:all'
            ],
          }, 'email']
        ])
        console.log(resp)
        update(list_all(resp.get('email').list[0]))
      })

    function list_all(email){
      return [
        list(email.from, 'from', "From: "),
        list(email.to,   'to',   "To: "),
        list(email.cc,   'cc',   "Cc: "),
        list(email.bcc,  'bcc',  "Bcc: "),
        list(email['header:Delivered-To:asAddresses:all'], 'delivered-to', "Delivered-To: "),
      ].filter(x => x).flat()
    }

    function list(list, header, text) {
      return list?.flat()?.map(a => ({
        text: (a.name ? `${text}${a.name} <${a.email}>` : text + a.email),
        value: `${header}:${a.email}`
      }))
    }
  }

  function get_dests() {
    return fancy([])
      .log(dests => console.log("[InboxFilterDialog] dests = %o", dests))
      .init(async (dests, {derive}) => {
        const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)
        derive(mailboxes[accountId], (dests, {ready, mailboxes}, {set}) => {
          if (!ready) return;
          set(mailboxes.map(mb => ({
            text: mb.name,
            value: mb.id
          })))
        })
      })
  }

  function close() {
    dispatch('close')
    isOpen = false
  }

  function accept(){
    dispatch('accept')
    isOpen = false
  }

  async function addMailbox() {
    const name = prompt("Mailbox name: ")
    const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)
    const resp = await jmap.request([
      ['Mailbox/set', {
        accountId,
        create: {
          mbox: {
            name
          }
        }
      }, 's']
    ])
  }

</script>

<Dialog
  open={isOpen}
  on:close
  initialFocus={completeButton}
  class="ui-dialog"
>
  <DialogOverlay class="ui-dialog-overlay" />

  <div class="ui-dialog-content">
    <DialogTitle class="ui-dialog-title">Filter message</DialogTitle>

    <p>
      Filter messages
      <select>
        {#each $headers as option}
          <option value={option.value}>{option.text}</option>
        {/each}
      </select>
      <br/>
      to
      <select>
        {#each $dests as option}
          <option value={option.value}>{option.text}</option>
        {/each}
      </select>
      <button on:click={addMailbox}> add... </button>
    </p>

    <div class="ui-dialog-buttons">
      <button on:click={close}> Cancel </button>
      <button on:click={accept} bind:this={completeButton}> Filter </button>
    </div>
  </div>
</Dialog>

<style>
</style>
