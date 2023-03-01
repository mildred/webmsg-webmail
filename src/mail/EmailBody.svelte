<script>
  // vim: ft=html

  import { ready, writable } from '../utils/store.js';
  import { purify } from '../utils/purify.js';
  import { onMount } from 'svelte';
  import EmailIcon from './EmailIcon.svelte';
  import { ctx } from '../context.js'
  import Time from "svelte-time";
  import { inview } from 'svelte-inview';
  import { BarLoader } from 'svelte-loading-spinners';

  export let email;
  export let show_header = true;
  export let show_keywords = false;

  const ALLOWED_TYPES = ['text/html', 'text/plain']

  let showing = writable(false)
  let body = getBody(email, showing);

  function show() {
    showing.update(_ => true)
  }

  async function getBody(email, showing){
    let bodyPart = email.htmlBody.concat(email.textBody).filter(part => ALLOWED_TYPES.includes(part.type))[0]
    let bodyType = bodyPart && bodyPart.charset ? `${bodyPart.type}; charset=${bodyPart.charset}` : (bodyPart || {}).type

    if (!bodyPart) {
      console.log("[EmailBody] no bodyPart")
      return null;
    }

    await ready(showing)
    const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)

    return jmap.blob_data(accountId, bodyPart.blobId, bodyPart.name, bodyType, purify)
  }


  // Attribution https://stackoverflow.com/a/64110252
  function fit(iframe) {
    if(!iframe) return;
    var iframes = [iframe] //document.querySelectorAll("iframe.gh-fit")

    for(var id = 0; id < iframes.length; id++) {
        var win = iframes[id].contentWindow
        var doc = win.document
        var html = doc.documentElement
        var body = doc.body
        var ifrm = iframes[id] // or win.frameElement

        if(body) {
            //body.style.overflowX = "scroll" // scrollbar-jitter fix
            body.style.overflowY = "hidden"
        }
        if(html) {
            //html.style.overflowX = "scroll" // scrollbar-jitter fix
            html.style.overflowY = "hidden"
            var style = win.getComputedStyle(html)
            //ifrm.width = parseInt(style.getPropertyValue("width")) // round value
            ifrm.height = parseInt(style.getPropertyValue("height"))
        }
    }

    requestAnimationFrame(() => fit(iframe))
  }

  async function load_body(iframe) {
    let fit_next_frame = requestAnimationFrame.bind(this, () => fit(iframe))

    let doc = await body

    let blob = new Blob([doc], {type : 'text/html; charset=url-8'});
    iframe.src = window.URL.createObjectURL(blob);
    fit_next_frame();

    return () => removeEventListener('load', fit_next_frame)
  }

</script>

<article class:unread={!email.keywords["$seen"]}>
  {#if show_header}
  <div class="row">
    <EmailIcon name={email.from[0].name} email={email.from[0].email} />
    <h1 class:unread={!email.keywords["$seen"]}>
      {email.subject}
    </h1>
  </div>
  {/if}
  <p>From:
    <em>
      <a href={`mailto:${email.from[0]?.email}`}>{email.from[0]?.name || email.from[0]?.email}</a>
      (<Time timestamp={email.sentAt} format="ddd MMM D H:mm" />)
    </em>
    {#if email.to?.length}
    <br />To: <em>
      {#each (email.to || []) as to}
        <a href={`mailto:${to.email}`}>{to.name || to.email}</a>
        {@html " " }
      {/each}
    </em>
    {/if}
    {#if email.cc?.length}
    <br/>Cc: <em>
      {#each (email.cc || []) as cc}
        <a href={`mailto:${cc.email}`}>{cc.name || cc.email}</a>
        {@html " " }
      {/each}
    </em>
    {/if}
  </p>
  {#if show_keywords}
    <p>Keywords: <em>{Object.keys(email.keywords).join(", ")}</em></p>
  {/if}
  {#await body}
    <p use:inview={{}} on:enter={show}>
      {email.preview}
      <center><BarLoader/></center>
    </p>
  {:then body}
    <!-- allow same origin in order to access frame content. Javascript shouldn't
    load anyway, and external resources are blocked by default. Moreover, we are
    not specifically a trusted origin, but that depends on the deployment.
    Anyway, the origin is not a good way to separate contexts. -->
    <!-- it's preferable to allow same-origin but not allow scripts -->
    <iframe title=""
            sandbox="allow-same-origin"
            use:load_body={{}}>
      <!--iframe sandbox src={URL.createObjectURL(blob)} bind:this={iframe}-->
    </iframe>
  {/await}
</article>

<style>
  iframe {
    width: 100%;
    border: none;
  }

  .row {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: 1rem;
  }

  .row > h1 {
    font-weight: normal;
    font-size: 1.2rem;
  }

  article.unread h1 {
    font-weight: bold;
  }
</style>

