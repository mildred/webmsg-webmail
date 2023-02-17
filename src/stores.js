import { writable, derived, get } from 'svelte/store';

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

export { get, derived }

export function combine(stores) {
  if (stores.subscribe) {
    stores = Array.from(arguments)
  }

  if (stores instanceof Array) {
    return derived(stores, (x) => x)
  } else {
    const names = []
    const store_arr = []
    for(const s of Object.keys(stores)) {
      names.push(s)
      store_arr.push(stores[s])
    }
    return derived(store_arr, (args) => {
      const res = {}
      for(let i = 0; i < names.length; i++) {
        res[names[i]] = args[i]
      }
      return res
    })
  }
}
