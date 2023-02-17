import { onMount } from 'svelte';

export function mounted() {
  return new Promise(accept => {
    onMount(() => accept(null))
  })
}
