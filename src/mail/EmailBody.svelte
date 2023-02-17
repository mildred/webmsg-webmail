<script>
  // vim: ft=html

  import { ready } from '../utils/stores.js';
  import { mounted } from '../utils/mount.js';
  import { purify } from '../utils/purify.js';
  import { onMount } from 'svelte';
  import EmailIcon from './EmailIcon.svelte';
  import { futureVisibility } from '../utils/visibility.js';
  import { ctx } from '../context.js'

  export let email;
  export let show_header = true;
  export let show_keywords = false;

  const ALLOWED_TYPES = ['text/html', 'text/plain']

  let articleElement

  let body = getBody(email);

  async function getBody(email){
    let bodyPart = email.htmlBody.concat(email.textBody).filter(part => ALLOWED_TYPES.includes(part.type))[0]
    let bodyType = bodyPart && bodyPart.charset ? `${bodyPart.type}; charset=${bodyPart.charset}` : (bodyPart || {}).type

    if (!bodyPart) {
      console.log("[EmailBody] no bodyPart")
      return null;
    }

    await mounted()
    const elem = await futureVisibility(articleElement)

    const { accountId, jmap } = await ready(ctx, ctx => ctx.ready)

    return jmap.blob_data(accountId, bodyPart.blobId, bodyPart.name, bodyType, purify)
  }


  let iframe;

  // Attribution https://stackoverflow.com/a/64110252
  function fit() {
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

    requestAnimationFrame(fit)
  }

  onMount(async () => {
    let cb = requestAnimationFrame.bind(this, fit)
    //let i = setInterval(cb, 1000)

    let doc = await body

    console.log("[EmailBody] got body", doc)

    // const charset = doc.match(/charset=['"]([^"']*)/)[1]
    let blob = new Blob([doc], {type : 'text/html; charset=url-8'});
    iframe.src = window.URL.createObjectURL(blob);
    //iframe.srcdoc = doc
    cb();
    //addEventListener('load', cb)

    return () => removeEventListener('load', cb)
    //return () => clearInterval(i)
  })

</script>

<article bind:this={articleElement}>
  {#if show_header}
  <div class="row">
    <EmailIcon name={email.from[0].name} email={email.from[0].email} />
    <h1>
      {#if !email.keywords["$seen"]}
        [unread]
      {/if}
      {email.subject}
    </h1>
  </div>
  {/if}
  <p>From: <em><a href={`mailto:${email.from[0]?.email}`}>{email.from[0]?.name || email.from[0]?.email}</a> ({email.sentAt})</em>
    {#if email.to?.length}
    <br />To: <em>
      {#each (email.to || []) as to}
        <a href={`mailto:${to.email}`}>{to.name || to.email}</a>
      {/each}
    </em>
    {/if}
    {#if email.cc?.length}
    <br/>Cc: <em>
      {#each (email.cc || []) as cc}
        <a href={`mailto:${cc.email}`}>{cc.name || cc.email}</a>
      {/each}
    </em>
    {/if}
  </p>
  {#if show_keywords}
    <p>Keywords: <em>{Object.keys(email.keywords).join(", ")}</em></p>
  {/if}
  {#await body}
    <p>{email.preview}</p>
  {:then blob}
    <!-- allow same origin in order to access frame content. Javascript shouldn't
    load anyway, and external resources are blocked by default. Moreover, we are
    not specifically a trusted origin, but that depends on the deployment.
    Anyway, the origin is not a good way to separate contexts. -->
    <!-- it's preferable to allow same-origin but not allow scripts -->
    <iframe title="" sandbox="allow-same-origin" bind:this={iframe}>
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
    flex-flow: row wrap;
    align-items: baseline;
  }
</style>

