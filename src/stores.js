import { writable, derived, get } from 'svelte/store';
export * from './utils/store.js';

const prefix = 'app'

export const jmap = writable(null)

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

