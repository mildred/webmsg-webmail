<script>
  // vim: ft=html

  import { inview } from 'svelte-inview';
  import { md5 } from '../md5.js';

  export let href = 'javascript:void(0)';
  export let name = '';
  export let email = '';
  export let icon = '404'

  let in_view = false

  $: email_hash = md5(email.toLowerCase())
  $: libravatar_url =
    `https://seccdn.libravatar.org/avatar/${email_hash}?s=128&d=${icon}`
  // <img src="https://seccdn.libravatar.org/avatar/HASH" referrerpolicy="no-referrer">

  function getInitials(name, num) {
    let res = []
    let words = name.split(/\s+/)
    num ||= words.length
    while(words.join('').length && res.join('').length < num) {
      for (let i = 0; i < words.length; i++) {
        res[i] ||= ''
        res[i] += words[i][0] || ''
        words[i] = words[i].substr(1)
        if (res.join('').length >= num) {
          return res.join('')
        }
      }
    }
    return res.join('')
  }

  function xmur3(str) {
      for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
          h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
          h = h << 13 | h >>> 19;
      } return function() {
          h = Math.imul(h ^ (h >>> 16), 2246822507);
          h = Math.imul(h ^ (h >>> 13), 3266489909);
          return (h ^= h >>> 16) >>> 0;
      }
  }

  $: initials = getInitials(name || (email || '').replace(/@.*/, '').replace(/[^A-Za-z0-9]/g, ''), 2)
  $: random = xmur3(email || '')
  $: hue = random() % 360
  $: hue2 = random() % 360

  function onerror() {
    this.style.display = 'none';
  }

  function enter() {
    in_view = true
  }

  function load_img(img, url) {
    img.onerror = onerror
  }

</script>

<a href={href}>
  <div class="text-avatar" title={`${name} <${email}>`}
       style="--hue: {hue}; --hue2: {hue2}"
       use:inview={{}}
       on:enter={e => enter()} >
    <div class="initials"><span>{initials}</span></div>
    <img src={libravatar_url}
         alt=''
         class:in_view={in_view}
         use:load_img />
  </div>
</a>

<style>
.hidden, img:not(.in_view) {
  display: none;
}

a {
  text-decoration: none;
}

.text-avatar {
  border-color: currentcolor;
  /* color: hsl(var(--hue), 100%, 30%); */
  color: black;
  background-color: hsl(calc(var(--hue2) + 180), 100%, 70%);
  border-color: hsl(calc(var(--hue2) + 180), 100%, 30%);
  text-align: center;
  width: 3em;
  height: 3em;
  border-radius: 50%;
  border-style: solid;
  border-width: 0.2em;
  position: relative;
}

.initials {
  text-transform: uppercase;
  position: absolute;
  left: 0;
  top: 0;
  font-weight: bold;
  line-height: 3em;
  width: 3em;
  height: 3em;
  clip-path: circle(1.5em at center);
}

.initials > span {
  font-size: 1.5em;
}

img {
  width: 3em;
  height: 3em;
  position: absolute;
  left: 0;
  top: 0;
  clip-path: circle(1.5em at center);
  background-color: white;
}
</style>
