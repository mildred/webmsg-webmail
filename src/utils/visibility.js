export function futureVisibility(element){
  return Promise.resolve(element).then(elem => new Promise((resolve, reject) => {
    new IntersectionObserver((entries, observer) => {
      for (let entry of entries) {
        if (!entry.isIntersecting) continue
        observer.disconnect()
        resolve(entry)
        break
      }
    }, {}).observe(elem)
  }))
}

