import { JMAP } from './jmap.js'
import { writable, derived, get } from 'svelte/store';
export * from './utils/store.js';

const prefix = 'app'

export const session = writable({
  default_value: true,
  ...JSON.parse(sessionStorage.getItem(`${prefix}.session`) || '{}')
});

session.subscribe(opts => {
  sessionStorage.setItem(`${prefix}.session`, JSON.stringify(opts))
})

export const local = writable({
  default_value: true,
  ...JSON.parse(localStorage.getItem(`${prefix}.local`) || '{}')
});

local.subscribe(opts => {
  localStorage.setItem(`${prefix}.local`, JSON.stringify(opts))
})

export const jmap_url = writable({
  // url: window.jmap_url,
  ...JSON.parse(localStorage.getItem(`${prefix}.jmap_url`) || '{}')
});

jmap_url.subscribe(opts => {
  localStorage.setItem(`${prefix}.jmap_url`, JSON.stringify(opts))
})

export const jmap = writable(null)
jmap_url.subscribe(({url}) => {
  if (url) jmap.set(new JMAP(url, session))
})

