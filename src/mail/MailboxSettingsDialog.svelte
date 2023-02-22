<script>
  // vim: ft=html

  import { fancy, readable, derived, ready } from '../stores.js'
  import { mailboxes } from '../mailboxes.js'
  import { createEventDispatcher } from 'svelte';
  import { ctx } from '../context.js'
  import { config } from '../config.js'
  import { headers_translate } from './filter.js';
  import {
    Dialog,
    DialogOverlay,
    DialogTitle,
    DialogDescription,
  } from "@rgossiaux/svelte-headlessui";
  import { BarLoader } from 'svelte-loading-spinners';
  import SvgIcon from '@jamescoyle/svelte-icon';
  import * as mdi from '@mdi/js';

  export let mailbox = {};
  export let open = true

  let completeButton = null
  const dispatch = createEventDispatcher();

  function close() {
    open = false
    dispatch('close')
  }

  async function accept(){
    dispatch('accept')
    return close()
  }

  async function rename() {
    const name = prompt("Rename mailbox to:", mailbox.name)
    if (!name || name == mailbox.name) return
    alert('TODO')
  }

</script>

<Dialog
  open={open}
  on:close
  initialFocus={completeButton}
  class="ui-dialog"
>
  <DialogOverlay class="ui-dialog-overlay" />

  <div class="ui-dialog-content">
    <button class="rename" on:click={rename}><SvgIcon type='mdi' path={mdi.mdiPencil} /></button>
    <DialogTitle class="ui-dialog-title">{mailbox.name}</DialogTitle>

    <p>
      <label>
        Display view:
        <select>
          <option>Threads, unreads first</option>
          <option>Threads, unreads mixed</option>
          <option>Threads, automatically mark as read</option>
          <option>E-mails inline, automatically mark as read</option>
          <option>E-mails with filtering options</option>
        </select>
      </label>
    </p>

    <p>
      <label>
        Order position:
        <input type=number value={mailbox.sortOrder} />
      </label>
    </p>

    <p>
      <label>
        <input type=checkbox />
        Show in top menu
      </label>
    </p>

    <p>
      <label>
        <input type=checkbox />
        Default mailbox on login
      </label>
    </p>

    <p>
      <label>
        <input type=checkbox />
        Run filters
      </label>
    </p>

    <div class="ui-dialog-buttons">
      <button on:click={close}> Cancel </button>
      <button on:click={accept} bind:this={completeButton}> Save </button>
    </div>
  </div>
</Dialog>

<style>
button.rename {
  float: right;
  background-color: transparent;
  border: none;
  cursor: pointer;
}
</style>
